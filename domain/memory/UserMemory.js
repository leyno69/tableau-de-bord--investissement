const ALLOWED_KEYS = Object.freeze([
  'financialGoals',
  'investorProfile',
  'riskTolerance',
  'preferences',
  'portfolio',
  'history',
  'etfs',
  'stocks',
  'budget',
  'broker'
]);

function clone(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(clone));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])));
  }
  return value;
}

export class UserMemory {
  constructor({ userId, entries = {}, version = 1, updatedAt = new Date(0).toISOString() } = {}) {
    if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('userId est obligatoire.');
    if (!Number.isInteger(version) || version < 1) throw new TypeError('version doit être un entier positif.');
    const unknownKeys = Object.keys(entries).filter(key => !ALLOWED_KEYS.includes(key));
    if (unknownKeys.length) throw new TypeError(`Clés mémoire inconnues: ${unknownKeys.join(', ')}.`);
    this.userId = userId.trim();
    this.entries = clone(entries);
    this.version = version;
    this.updatedAt = new Date(updatedAt).toISOString();
    Object.freeze(this);
  }

  withEntry(key, value, updatedAt) {
    if (!ALLOWED_KEYS.includes(key)) throw new TypeError(`Clé mémoire inconnue: ${key}.`);
    return new UserMemory({
      userId: this.userId,
      entries: { ...this.entries, [key]: value },
      version: this.version + 1,
      updatedAt
    });
  }
}

export { ALLOWED_KEYS as USER_MEMORY_KEYS };
