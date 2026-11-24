export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  at: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  /** What older messages were folded into. */
  summary: string | null;
  messages: StoredMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/** The conversation does not exist for this user (it may exist for someone else: the two look the same). */
export class ConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found');
  }
}

/**
 * The port: where conversations are kept. Every method takes the `userId`, and a conversation is only ever
 * found together with its owner, so one user can never read, extend, change or delete another's.
 */
export abstract class ConversationStore {
  /** Adds messages, creating the conversation on first use. Throws `ConversationNotFoundError` when the id belongs to someone else. */
  abstract append(
    userId: string,
    id: string,
    messages: StoredMessage[],
  ): Promise<void>;
  abstract load(userId: string, id: string): Promise<Conversation | null>;
  /** The latest conversations of a user, newest first, without their messages. */
  abstract list(
    userId: string,
    limit: number,
  ): Promise<Omit<Conversation, 'messages'>[]>;
  /** Replaces the first `count` messages with a summary. */
  abstract compact(
    userId: string,
    id: string,
    count: number,
    summary: string,
  ): Promise<void>;
  abstract remove(userId: string, id: string): Promise<boolean>;
  abstract removeAllOf(userId: string): Promise<number>;
}
