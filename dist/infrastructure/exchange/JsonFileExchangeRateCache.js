import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export class JsonFileExchangeRateCache {
  static async open({ filePath, fileSystem = defaultFileSystem() } = {}) {
    const cache = new JsonFileExchangeRateCache({ filePath, fileSystem });
    await cache.load();
    return cache;
  }

  constructor({ filePath, fileSystem = defaultFileSystem() } = {}) {
    if (typeof filePath !== 'string' || filePath.trim() === '') throw new TypeError('filePath doit être une chaîne non vide.');
    for (const method of ['mkdir', 'readFile', 'open', 'rename', 'rm']) {
      if (typeof fileSystem?.[method] !== 'function') throw new TypeError(`fileSystem doit implémenter ${method}().`);
    }
    this.filePath = resolve(filePath.trim());
    this.fileSystem = fileSystem;
    this.entries = new Map();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    let text;
    try { text = await this.fileSystem.readFile(this.filePath, 'utf8'); }
    catch (error) { if (error?.code === 'ENOENT') return this; throw error; }

    let payload;
    try { payload = JSON.parse(text); }
    catch (cause) { throw new SyntaxError(`Le cache JSON "${this.filePath}" est invalide.`, { cause }); }
    if (!payload || payload.version !== 1 || !Array.isArray(payload.rates)) {
      throw new TypeError('Le cache JSON doit contenir version=1 et un tableau rates.');
    }
    this.entries.clear();
    for (const entry of payload.rates) this.#store(entry);
    return this;
  }

  async get(from, to) {
    const entry = this.entries.get(key(from, to));
    return entry == null ? null : structuredClone(entry);
  }

  async save({ from, to, rate, fetchedAt }) {
    const entry = this.#store({ from, to, rate, fetchedAt });
    await this.#schedulePersist();
    return structuredClone(entry);
  }

  async flush() { await this.writeQueue; }

  #store({ from, to, rate, fetchedAt }) {
    const normalizedFrom = currency(from, 'from');
    const normalizedTo = currency(to, 'to');
    const normalizedRate = Number(rate);
    if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) throw new RangeError('rate doit être strictement positif.');
    const timestamp = Date.parse(fetchedAt);
    if (!Number.isFinite(timestamp)) throw new TypeError('fetchedAt doit être une date valide.');
    const entry = Object.freeze({ from: normalizedFrom, to: normalizedTo, rate: normalizedRate, fetchedAt: new Date(timestamp).toISOString() });
    this.entries.set(key(normalizedFrom, normalizedTo), entry);
    return entry;
  }

  #schedulePersist() {
    const operation = this.writeQueue.then(() => this.#persist());
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async #persist() {
    await this.fileSystem.mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const payload = JSON.stringify({ version: 1, rates: [...this.entries.values()].sort((a, b) => key(a.from, a.to).localeCompare(key(b.from, b.to))) }, null, 2) + '\n';
    let handle;
    try {
      handle = await this.fileSystem.open(temporaryPath, 'wx');
      await handle.writeFile(payload, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await this.fileSystem.rename(temporaryPath, this.filePath);
    } catch (error) {
      await handle?.close().catch(() => {});
      await this.fileSystem.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}

function currency(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) throw new TypeError(`${field} doit être un code ISO à trois lettres.`);
  return value.trim().toUpperCase();
}
function key(from, to) { return `${currency(from, 'from')}/${currency(to, 'to')}`; }
function defaultFileSystem() { return Object.freeze({ mkdir, readFile, open, rename, rm }); }
