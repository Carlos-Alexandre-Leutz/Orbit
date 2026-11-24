import { OnModuleDestroy } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';
import {
  Conversation,
  ConversationNotFoundError,
  ConversationStore,
  StoredMessage,
} from './conversation-store';

interface Doc extends Omit<Conversation, 'id'> {
  _id: string;
}

const DUPLICATE_KEY = 11000;

/** Keeps conversations in MongoDB (`conversations`), one document each, and lets idle ones expire. */
export class MongoConversationStore
  extends ConversationStore
  implements OnModuleDestroy
{
  private readonly client: MongoClient;
  private collection?: Promise<Collection<Doc>>;

  constructor(
    url: string,
    private readonly ttlDays = 30,
  ) {
    super();
    this.client = new MongoClient(url, { serverSelectionTimeoutMS: 2000 });
  }

  private open() {
    this.collection ??= (async () => {
      await this.client.connect();
      const collection = this.client.db().collection<Doc>('conversations');
      const expireAfterSeconds = this.ttlDays * 86_400;
      try {
        await collection.createIndex({ updatedAt: 1 }, { expireAfterSeconds });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 85 && code !== 86) throw error;
        await this.client.db().command({
          collMod: 'conversations',
          index: { keyPattern: { updatedAt: 1 }, expireAfterSeconds },
        });
      }
      await collection.createIndex({ userId: 1, updatedAt: -1 });
      return collection;
    })();
    this.collection.catch(() => (this.collection = undefined));
    return this.collection;
  }

  async append(userId: string, id: string, messages: StoredMessage[]) {
    const collection = await this.open();
    const now = new Date();
    const updated = await collection.updateOne(
      { _id: id, userId },
      { $push: { messages: { $each: messages } }, $set: { updatedAt: now } },
    );
    if (updated.matchedCount === 1) return;
    try {
      await collection.insertOne({
        _id: id,
        userId,
        summary: null,
        messages,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      // The id exists and belongs to someone else: to this user it does not exist.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConversationNotFoundError();
      }
      throw error;
    }
  }

  async load(userId: string, id: string) {
    const doc = await (await this.open()).findOne({ _id: id, userId });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
  }

  async list(userId: string, limit: number) {
    const docs = await (
      await this.open()
    )
      .find({ userId }, { projection: { messages: 0 } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(
      ({ _id, ...rest }) =>
        ({ id: _id, ...rest }) as Omit<Conversation, 'messages'>,
    );
  }

  async compact(userId: string, id: string, count: number, summary: string) {
    const collection = await this.open();
    // Pipeline update: cut the first `count` messages and set the summary in one step.
    const done = await collection.updateOne({ _id: id, userId }, [
      {
        $set: {
          summary,
          messages: { $slice: ['$messages', count, { $size: '$messages' }] },
        },
      },
    ]);
    if (done.matchedCount !== 1) throw new ConversationNotFoundError();
  }

  async remove(userId: string, id: string) {
    const done = await (await this.open()).deleteOne({ _id: id, userId });
    return done.deletedCount === 1;
  }

  async removeAllOf(userId: string) {
    return (await (await this.open()).deleteMany({ userId })).deletedCount;
  }

  async onModuleDestroy() {
    await this.client.close().catch(() => undefined);
  }
}
