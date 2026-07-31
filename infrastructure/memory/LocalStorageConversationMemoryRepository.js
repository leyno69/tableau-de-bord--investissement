import { ConversationMemory } from '../../domain/memory/ConversationMemory.js';

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage doit exposer getItem() et setItem().');
  }
}

export class LocalStorageConversationMemoryRepository {
  constructor({ storage, namespace = 'leynor:memory:conversation' } = {}) {
    requireStorage(storage);
    this.storage = storage;
    this.namespace = String(namespace).trim();
    Object.freeze(this);
  }

  key(conversationId) {
    if (typeof conversationId !== 'string' || !conversationId.trim()) throw new TypeError('conversationId est obligatoire.');
    return `${this.namespace}:${encodeURIComponent(conversationId.trim())}`;
  }

  async getByConversationId(conversationId) {
    const raw = this.storage.getItem(this.key(conversationId));
    if (raw === null) return null;
    return new ConversationMemory(JSON.parse(raw));
  }

  async save(memory) {
    if (!(memory instanceof ConversationMemory)) throw new TypeError('memory doit être une ConversationMemory.');
    this.storage.setItem(this.key(memory.conversationId), JSON.stringify(memory));
    return memory;
  }
}
