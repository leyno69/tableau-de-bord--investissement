import { UserMemory } from '../../domain/memory/UserMemory.js';

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage doit exposer getItem() et setItem().');
  }
}

export class LocalStorageUserMemoryRepository {
  constructor({ storage, namespace = 'leynor:memory:user' } = {}) {
    requireStorage(storage);
    this.storage = storage;
    this.namespace = String(namespace).trim();
    Object.freeze(this);
  }

  key(userId) {
    if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('userId est obligatoire.');
    return `${this.namespace}:${encodeURIComponent(userId.trim())}`;
  }

  async getByUserId(userId) {
    const raw = this.storage.getItem(this.key(userId));
    if (raw === null) return null;
    return new UserMemory(JSON.parse(raw));
  }

  async save(memory) {
    if (!(memory instanceof UserMemory)) throw new TypeError('memory doit être une UserMemory.');
    this.storage.setItem(this.key(memory.userId), JSON.stringify(memory));
    return memory;
  }
}
