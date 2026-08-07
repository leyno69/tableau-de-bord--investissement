import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { Instrument } from '../../domain/instrument/Instrument.js';
import { InMemoryInstrumentRepository } from './InMemoryInstrumentRepository.js';

/**
 * Dépôt durable fondé sur un fichier JSON remplacé atomiquement.
 *
 * Toutes les écritures sont sérialisées dans le processus. Le fichier temporaire
 * est synchronisé avant renommage afin d'éviter les fichiers partiellement écrits.
 */
export class JsonFileInstrumentRepository extends InMemoryInstrumentRepository {
  static async open({ filePath, fileSystem = defaultFileSystem() } = {}) {
    const repository = new JsonFileInstrumentRepository({ filePath, fileSystem });
    await repository.load();
    return repository;
  }

  constructor({ filePath, fileSystem = defaultFileSystem() } = {}) {
    super();
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new TypeError('filePath doit être une chaîne non vide.');
    }
    if (!fileSystem || typeof fileSystem !== 'object') {
      throw new TypeError('fileSystem doit être un objet.');
    }
    for (const method of ['mkdir', 'readFile', 'open', 'rename', 'rm']) {
      if (typeof fileSystem[method] !== 'function') {
        throw new TypeError(`fileSystem doit implémenter ${method}().`);
      }
    }

    this.filePath = resolve(filePath.trim());
    this.fileSystem = fileSystem;
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
      throw new SyntaxError(`Le catalogue JSON "${this.filePath}" est invalide.`, { cause });
    }
    if (!payload || payload.version !== 1 || !Array.isArray(payload.instruments)) {
      throw new TypeError('Le catalogue JSON doit contenir version=1 et un tableau instruments.');
    }

    this.instruments.clear();
    for (const input of payload.instruments) super.save(new Instrument(input));
    return this;
  }

  async save(instrument) {
    super.save(instrument);
    await this.#schedulePersist();
    return instrument;
  }

  async delete(id) {
    const deleted = await super.delete(id);
    if (deleted) await this.#schedulePersist();
    return deleted;
  }

  async flush() {
    await this.writeQueue;
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
      instruments: [...this.instruments.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map(instrument => instrument.toJSON())
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

function defaultFileSystem() {
  return Object.freeze({ mkdir, readFile, open, rename, rm });
}
