import { Instrument } from '../../domain/instrument/Instrument.js';

export class InMemoryInstrumentRepository {
  constructor(instruments = []) {
    if (!Array.isArray(instruments)) throw new TypeError('instruments doit être un tableau.');
    this.instruments = new Map();
    for (const instrument of instruments) this.save(instrument);
  }

  save(instrument) {
    if (!(instrument instanceof Instrument)) throw new TypeError('instrument doit être une instance de Instrument.');
    this.instruments.set(instrument.id, instrument);
    return instrument;
  }

  async findById(id) {
    return this.instruments.get(requiredText(id, 'id')) ?? null;
  }

  async search(query = '') {
    const needle = String(query ?? '').trim().toUpperCase();
    const values = [...this.instruments.values()];
    if (needle === '') return values.sort((a, b) => a.id.localeCompare(b.id));
    return values.filter(instrument => searchable(instrument).some(value => value.includes(needle)))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async delete(id) {
    return this.instruments.delete(requiredText(id, 'id'));
  }

  async findByAnyIdentifier(identifier) {
    const needle = requiredText(identifier, 'identifier').toUpperCase();
    return [...this.instruments.values()].filter(instrument => {
      if (instrument.id.toUpperCase() === needle) return true;
      if (instrument.isin?.toUpperCase() === needle) return true;
      if (instrument.ticker?.toUpperCase() === needle) return true;
      return instrument.providerMappings.some(mapping =>
        mapping.symbol.toUpperCase() === needle || mapping.externalId?.toUpperCase() === needle
      );
    });
  }
}

function searchable(instrument) {
  return [instrument.id, instrument.name, instrument.isin, instrument.ticker, instrument.venue,
    ...instrument.providerMappings.flatMap(mapping => [mapping.provider, mapping.symbol, mapping.externalId])]
    .filter(Boolean).map(value => value.toUpperCase());
}

function requiredText(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
