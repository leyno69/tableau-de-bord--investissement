import test from 'node:test';
import assert from 'node:assert/strict';
import { UserMemory } from '../../domain/memory/UserMemory.js';
import { ConversationMemory } from '../../domain/memory/ConversationMemory.js';
import { LocalStorageUserMemoryRepository } from '../../infrastructure/memory/LocalStorageUserMemoryRepository.js';
import { LocalStorageConversationMemoryRepository } from '../../infrastructure/memory/LocalStorageConversationMemoryRepository.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('la mémoire utilisateur survit à la sérialisation locale', async () => {
  const repository = new LocalStorageUserMemoryRepository({ storage: createStorage() });
  const memory = new UserMemory({ userId: 'user 1', entries: { broker: 'Trade Republic' }, version: 2 });
  await repository.save(memory);
  const restored = await repository.getByUserId('user 1');
  assert.ok(restored instanceof UserMemory);
  assert.deepEqual(restored.entries, { broker: 'Trade Republic' });
  assert.equal(restored.version, 2);
  assert.ok(Object.isFrozen(restored));
});

test('la mémoire conversationnelle est restaurée comme objet métier', async () => {
  const repository = new LocalStorageConversationMemoryRepository({ storage: createStorage() });
  const memory = new ConversationMemory({
    conversationId: 'conversation/1',
    userId: 'user-1',
    messages: [{ id: 'm1', role: 'user', content: 'Bonjour' }]
  });
  await repository.save(memory);
  const restored = await repository.getByConversationId('conversation/1');
  assert.ok(restored instanceof ConversationMemory);
  assert.equal(restored.messages[0].content, 'Bonjour');
  assert.ok(Object.isFrozen(restored.messages));
});

test('les dépôts refusent les objets non métier et signalent une donnée corrompue', async () => {
  const storage = createStorage();
  const users = new LocalStorageUserMemoryRepository({ storage });
  await assert.rejects(() => users.save({ userId: 'x' }), /UserMemory/);
  storage.setItem('leynor:memory:user:broken', '{');
  await assert.rejects(() => users.getByUserId('broken'), SyntaxError);
});
