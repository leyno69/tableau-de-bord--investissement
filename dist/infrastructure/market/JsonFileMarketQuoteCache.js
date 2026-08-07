import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Cache durable des dernières cotations connues, remplacé atomiquement.
 *
 * Le cache conserve une seule cotation par actif avec son horodatage de collecte.
 * Les valeurs sont sérialisées afin de rester indépendantes du fournisseur marché.
 */
export class JsonFileMarketQuoteCache {
  static async open({ filePath, fileSystem = defaultFileSystem() } = {}) {
    const cache = new JsonFileMarketQuoteCache({ filePath, fileSystem });
    await cache.load();
    return cache;
  }

  constructor({ filePath, fileSystem = defaultFileSystem() } = {}) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new TypeError('filePath doit être une chaîne non vide.');
    }
    for (const method of ['mkdir', 'readFile', 'open', 'rename', 'rm']) {
      if (typeof fileSystem?.[method] !== 'function') {
        throw new TypeError(`fileSystem doit implémenter ${method}().`);
      }
    }

    this.filePath = resolve(filePath.trim());
    this.fileSystem = fileSystem;
    this.entries = new Map();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    let text;
    try {
      text = await this.fileSystem.readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return this;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (cause) {
      throw new SyntaxError(`Le cache JSON "${this.filePath}" est invalide.`, { cause });
    }
    if (!payload || payload.version !== 1 || !Array.isArray(payload.quotes)) {
      throw new TypeError('Le cache JSON doit contenir version=1 et un tableau quotes.');
    }

    this.entries.clear();
    for (const entry of payload.quotes) this.#validateAndStore(entry);
    return this;
  }

  async get(assetId) {
    const normalized = text(assetId, 'assetId');
    const entry = this.entries.get(normalized);
    return entry == null ? null : clone(entry);
  }

  async save({ assetId, quote, fetchedAt }) {
    const entry = this.#validateAndStore({ assetId, quote, fetchedAt });
    await this.#schedulePersist();
    return clone(entry);
  }

  async flush() {
    await this.writeQueue;
  }

  #validateAndStore({ assetId, quote, fetchedAt }) {
    const normalizedAssetId = text(assetId, 'assetId');
    if (!quote || typeof quote !== 'object' || Array.isArray(quote)) {
      throw new TypeError('quote doit être un objet.');
    }
    const timestamp = Date.parse(fetchedAt);
    if (!Number.isFinite(timestamp)) throw new TypeError('fetchedAt doit être une date valide.');

    const entry = Object.freeze({
      assetId: normalizedAssetId,
      quote: clone(quote),
      fetchedAt: new Date(timestamp).toISOString()
    });
    this.entries.set(normalizedAssetId, entry);
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
    const payload = JSON.stringify({
      version: 1,
      quotes: [...this.entries.values()].sort((left, right) => left.assetId.localeCompare(right.assetId))
    }, null, 2) + '\n';

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

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function clone(value) {
  return structuredClone(value);
}

function defaultFileSystem() {
  return Object.freeze({ mkdir, readFile, open, rename, rm });
}
