import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConversationMemory } from './conversation-memory';
import { ConversationsController } from './conversations.controller';
import { InMemoryConversationStore } from './in-memory-conversation-store';

const ID = '11111111-1111-4111-8111-111111111111';
const req = (id: string) => ({ user: { id, role: Role.CUSTOMER } }) as never;

async function setup() {
  const memory = new ConversationMemory(
    new InMemoryConversationStore(),
    {} as never,
    { keepMessages: 4, summarizeAbove: 99, hardCap: 99 },
  );
  await memory.remember('alice', ID, 'hello', 'hi');
  return new ConversationsController(memory);
}

describe('ConversationsController', () => {
  it('lists, shows and deletes the conversations of the user', async () => {
    const controller = await setup();
    expect((await controller.list(req('alice'))).map((c) => c.id)).toEqual([
      ID,
    ]);
    expect((await controller.get(ID, req('alice'))).messages).toHaveLength(2);
    await controller.remove(ID, req('alice'));
    await expect(controller.get(ID, req('alice'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('answers 404 for the conversation of someone else', async () => {
    const controller = await setup();
    expect(await controller.list(req('bob'))).toEqual([]);
    await expect(controller.get(ID, req('bob'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.remove(ID, req('bob'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await controller.get(ID, req('alice'))).messages).toHaveLength(2);
  });
});
