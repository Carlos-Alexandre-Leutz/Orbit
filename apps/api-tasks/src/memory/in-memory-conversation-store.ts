import {
  Conversation,
  ConversationNotFoundError,
  ConversationStore,
  StoredMessage,
} from './conversation-store';

/** Keeps conversations in the process: for tests, and for a server with no MongoDB (lost on restart). */
export class InMemoryConversationStore extends ConversationStore {
  private readonly items = new Map<string, Conversation>();

  private owned(userId: string, id: string) {
    const found = this.items.get(id);
    return found && found.userId === userId ? found : undefined;
  }

  append(userId: string, id: string, messages: StoredMessage[]): Promise<void> {
    const existing = this.items.get(id);
    if (existing && existing.userId !== userId) {
      return Promise.reject(new ConversationNotFoundError());
    }
    const now = new Date();
    const conversation = existing ?? {
      id,
      userId,
      summary: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    conversation.messages.push(...messages);
    conversation.updatedAt = now;
    this.items.set(id, conversation);
    return Promise.resolve();
  }

  load(userId: string, id: string) {
    const found = this.owned(userId, id);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  list(userId: string, limit: number) {
    return Promise.resolve(
      [...this.items.values()]
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit)
        .map(({ messages: _messages, ...rest }) => structuredClone(rest)),
    );
  }

  compact(userId: string, id: string, count: number, summary: string) {
    const found = this.owned(userId, id);
    if (!found) return Promise.reject(new ConversationNotFoundError());
    found.messages = found.messages.slice(count);
    found.summary = summary;
    return Promise.resolve();
  }

  remove(userId: string, id: string) {
    return Promise.resolve(
      this.owned(userId, id) ? this.items.delete(id) : false,
    );
  }

  removeAllOf(userId: string) {
    let removed = 0;
    for (const [id, c] of this.items) {
      if (c.userId === userId) {
        this.items.delete(id);
        removed++;
      }
    }
    return Promise.resolve(removed);
  }
}
