import { UserMemory } from '../../domain/memory/UserMemory.js';
import { ConversationMemory } from '../../domain/memory/ConversationMemory.js';

export class MemoryService {
  constructor({ userMemoryRepository, conversationMemoryRepository, clock = () => new Date() } = {}) {
    if (!userMemoryRepository || typeof userMemoryRepository.getByUserId !== 'function' || typeof userMemoryRepository.save !== 'function') {
      throw new TypeError('userMemoryRepository invalide.');
    }
    if (!conversationMemoryRepository || typeof conversationMemoryRepository.getByConversationId !== 'function' || typeof conversationMemoryRepository.save !== 'function') {
      throw new TypeError('conversationMemoryRepository invalide.');
    }
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
    this.userMemoryRepository = userMemoryRepository;
    this.conversationMemoryRepository = conversationMemoryRepository;
    this.clock = clock;
    Object.freeze(this);
  }

  async rememberUserEntry({ userId, key, value }) {
    const existing = await this.userMemoryRepository.getByUserId(userId);
    const memory = existing ?? new UserMemory({ userId });
    const updated = memory.withEntry(key, value, this.clock().toISOString());
    await this.userMemoryRepository.save(updated);
    return updated;
  }

  async appendConversationMessage({ conversationId, userId, message }) {
    const existing = await this.conversationMemoryRepository.getByConversationId(conversationId);
    if (existing && existing.userId !== userId) throw new Error('La conversation appartient à un autre utilisateur.');
    const memory = existing ?? new ConversationMemory({ conversationId, userId });
    const updated = memory.append(message);
    await this.conversationMemoryRepository.save(updated);
    return updated;
  }

  async buildContext({ userId, conversationId, messageLimit = 12 }) {
    if (!Number.isInteger(messageLimit) || messageLimit < 0) throw new TypeError('messageLimit doit être un entier positif ou nul.');
    const [userMemory, conversationMemory] = await Promise.all([
      this.userMemoryRepository.getByUserId(userId),
      conversationId ? this.conversationMemoryRepository.getByConversationId(conversationId) : null
    ]);
    const messages = conversationMemory?.messages.slice(-messageLimit) ?? [];
    return Object.freeze({
      user: userMemory?.entries ?? Object.freeze({}),
      conversation: Object.freeze({
        id: conversationMemory?.conversationId ?? null,
        summary: conversationMemory?.summary ?? '',
        messages: Object.freeze(messages)
      })
    });
  }
}
