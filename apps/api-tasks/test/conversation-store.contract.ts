import { randomUUID } from 'node:crypto';
import {
  ConversationNotFoundError,
  ConversationStore,
  StoredMessage,
} from '../src/memory/conversation-store';

const message = (
  role: 'user' | 'assistant',
  content: string,
): StoredMessage => ({
  role,
  content,
  at: new Date(),
});

/**
 * What every conversation store must do, above all keep users apart. Run against the in-memory store and
 * against MongoDB, so the two cannot drift.
 */
export function conversationStoreContract(
  label: string,
  create: () => ConversationStore,
  cleanup?: (store: ConversationStore) => Promise<void>,
) {
  describe(`conversation store contract: ${label}`, () => {
    const store = create();
    const alice = `alice-${randomUUID()}`;
    const bob = `bob-${randomUUID()}`;
    const id = randomUUID();

    afterAll(async () => {
      await store.removeAllOf(alice);
      await store.removeAllOf(bob);
      await cleanup?.(store);
    });

    it('creates a conversation on the first append and keeps the order of messages', async () => {
      await store.append(alice, id, [
        message('user', 'one'),
        message('assistant', 'two'),
      ]);
      await store.append(alice, id, [message('user', 'three')]);
      const loaded = await store.load(alice, id);
      expect(loaded?.messages.map((m) => m.content)).toEqual([
        'one',
        'two',
        'three',
      ]);
      expect(loaded).toMatchObject({ id, userId: alice, summary: null });
    });

    it('does not show the conversation to another user', async () => {
      expect(await store.load(bob, id)).toBeNull();
      expect((await store.list(bob, 10)).map((c) => c.id)).not.toContain(id);
      expect((await store.list(alice, 10)).map((c) => c.id)).toContain(id);
    });

    it('does not let another user add to it, even knowing the id', async () => {
      await expect(
        store.append(bob, id, [message('user', 'intruder')]),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      expect(
        (await store.load(alice, id))?.messages.map((m) => m.content),
      ).not.toContain('intruder');
    });

    it('does not let another user compact or delete it', async () => {
      await expect(
        store.compact(bob, id, 1, 'forged summary'),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      expect(await store.remove(bob, id)).toBe(false);
      expect(await store.removeAllOf(bob)).toBe(0);
      const loaded = await store.load(alice, id);
      expect(loaded?.summary).toBeNull();
      expect(loaded?.messages).toHaveLength(3);
    });

    it('folds the first messages into a summary and keeps the rest', async () => {
      await store.compact(alice, id, 2, 'the user said one, the assistant two');
      const loaded = await store.load(alice, id);
      expect(loaded?.summary).toBe('the user said one, the assistant two');
      expect(loaded?.messages.map((m) => m.content)).toEqual(['three']);
    });

    it("lists the newest first and deletes only what is the user's", async () => {
      const other = randomUUID();
      await store.append(alice, other, [message('user', 'later')]);
      expect(
        (await store.list(alice, 10)).map((c) => c.id).slice(0, 2),
      ).toEqual([other, id]);
      expect(await store.remove(alice, other)).toBe(true);
      expect(await store.remove(alice, other)).toBe(false);
      expect(await store.removeAllOf(alice)).toBe(1);
      expect(await store.load(alice, id)).toBeNull();
    });
  });
}
