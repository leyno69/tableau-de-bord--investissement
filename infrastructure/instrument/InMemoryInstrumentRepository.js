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

function requiredText(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
