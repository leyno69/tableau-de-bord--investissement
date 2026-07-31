import test from 'node:test';
import assert from 'node:assert/strict';
import { UserMemory } from '../../domain/memory/UserMemory.js';
import { ConversationMemory } from '../../domain/memory/ConversationMemory.js';
import { MemoryService } from '../../application/services/MemoryService.js';

class InMemoryRepository {
  constructor(key) { this.key = key; this.items = new Map(); }
  async getByUserId(id) { return this.items.get(id) ?? null; }
  async getByConversationId(id) { return this.items.get(id) ?? null; }
  async save(value) { this.items.set(value[this.key], value); }
}

test('UserMemory reste immuable et versionnée', () => {
  const initial = new UserMemory({ userId: 'u1' });
  const updated = initial.withEntry('riskTolerance', 'balanced', '2026-07-31T12:00:00.000Z');
  assert.equal(initial.entries.riskTolerance, undefined);
  assert.equal(updated.entries.riskTolerance, 'balanced');
  assert.equal(updated.version, 2);
  assert.ok(Object.isFrozen(updated.entries));
});

test('ConversationMemory refuse les rôles inconnus', () => {
  const memory = new ConversationMemory({ conversationId: 'c1', userId: 'u1' });
  assert.throws(() => memory.append({ role: 'broker', content: 'acheter' }), /role/);
});

test('MemoryService construit un contexte borné indépendant du LLM', async () => {
  const users = new InMemoryRepository('userId');
  const conversations = new InMemoryRepository('conversationId');
  const service = new MemoryService({
    userMemoryRepository: users,
    conversationMemoryRepository: conversations,
    clock: () => new Date('2026-07-31T12:00:00.000Z')
  });
  await service.rememberUserEntry({ userId: 'u1', key: 'broker', value: 'Trade Republic' });
  await service.appendConversationMessage({ conversationId: 'c1', userId: 'u1', message: { id: '1', role: 'user', content: 'Premier message' } });
  await service.appendConversationMessage({ conversationId: 'c1', userId: 'u1', message: { id: '2', role: 'assistant', content: 'Deuxième message' } });
  const context = await service.buildContext({ userId: 'u1', conversationId: 'c1', messageLimit: 1 });
  assert.equal(context.user.broker, 'Trade Republic');
  assert.equal(context.conversation.messages.length, 1);
  assert.equal(context.conversation.messages[0].id, '2');
  assert.ok(Object.isFrozen(context));
});
