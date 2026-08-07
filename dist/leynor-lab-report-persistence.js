import { LabReportCatalog } from './leynor-lab-report-catalog.js';

function requiredStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    throw new TypeError('storage doit exposer getItem, setItem et removeItem.');
  }
  return storage;
}

function requiredKey(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('key doit être une chaîne non vide.');
  return value.trim();
}

export class LabReportCatalogStore {
  #storage;
  #key;

  constructor({ storage, key = 'leynor.lab.reports.v1' }) {
    this.#storage = requiredStorage(storage);
    this.#key = requiredKey(key);
  }

  load() {
    const raw = this.#storage.getItem(this.#key);
    if (raw == null) return new LabReportCatalog();
    try {
      return LabReportCatalog.fromJSON(JSON.parse(raw));
    } catch (error) {
      throw new Error('Catalogue de rapports LEYNOR corrompu ou incompatible.', { cause: error });
    }
  }

  save(catalog) {
    if (!(catalog instanceof LabReportCatalog)) throw new TypeError('catalog doit être un LabReportCatalog.');
    const serialized = JSON.stringify(catalog.toJSON());
    this.#storage.setItem(this.#key, serialized);
    return Object.freeze({ key: this.#key, bytes: new TextEncoder().encode(serialized).byteLength, entries: catalog.size });
  }

  add(entry) {
    const catalog = this.load();
    const added = catalog.add(entry);
    this.save(catalog);
    return added;
  }

  clear() {
    this.#storage.removeItem(this.#key);
  }
}
