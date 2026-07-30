import { Instrument } from '../../domain/instrument/Instrument.js';

export class InstrumentCatalogError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'InstrumentCatalogError';
    this.code = code;
  }
}

export class InstrumentCatalog {
  constructor({ instrumentRepository }) {
    for (const method of ['save', 'findById', 'search', 'delete']) {
      if (!instrumentRepository || typeof instrumentRepository[method] !== 'function') {
        throw new TypeError(`instrumentRepository doit implémenter ${method}().`);
      }
    }
    this.repository = instrumentRepository;
  }

  async create(input) {
    const instrument = new Instrument(input);
    if (await this.repository.findById(instrument.id)) {
      throw new InstrumentCatalogError(`L’instrument "${instrument.id}" existe déjà.`, 'INSTRUMENT_CONFLICT');
    }
    return this.repository.save(instrument);
  }

  async get(id) {
    const instrument = await this.repository.findById(id);
    if (!instrument) throw new InstrumentCatalogError(`Instrument "${id}" introuvable.`, 'INSTRUMENT_NOT_FOUND');
    return instrument;
  }

  async search(query = '') {
    return this.repository.search(query);
  }

  async update(id, changes) {
    const current = await this.get(id);
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new TypeError('changes doit être un objet.');
    const updated = new Instrument({ ...current.toJSON(), ...changes, id: current.id });
    return this.repository.save(updated);
  }

  async replaceProviderMappings(id, providerMappings) {
    if (!Array.isArray(providerMappings)) throw new TypeError('providerMappings doit être un tableau.');
    return this.update(id, { providerMappings });
  }

  async remove(id) {
    await this.get(id);
    await this.repository.delete(id);
  }
}
