import { MongoClient } from 'mongodb';
import { InMemoryConversationStore } from '../src/memory/in-memory-conversation-store';
import { MongoConversationStore } from '../src/memory/mongo-conversation-store';
import { conversationStoreContract } from './conversation-store.contract';

conversationStoreContract('in memory', () => new InMemoryConversationStore());

const url = process.env.MONGO_URL;
if (url) {
  conversationStoreContract(
    'MongoDB',
    () => new MongoConversationStore(url, 7),
    async (store) => {
      await (store as MongoConversationStore).onModuleDestroy();
    },
  );

  describe('MongoConversationStore indexes', () => {
    it('expires idle conversations', async () => {
      const store = new MongoConversationStore(url, 7);
      await store.list('nobody', 1);
      const client = new MongoClient(url);
      const indexes = await client.db().collection('conversations').indexes();
      await client.close();
      await store.onModuleDestroy();
      expect(indexes.some((i) => i.expireAfterSeconds === 7 * 86400)).toBe(
        true,
      );
    });
  });
} else {
  describe.skip('conversation store contract: MongoDB (needs MONGO_URL)', () => {
    it('is skipped without MONGO_URL', () => undefined);
  });
}
