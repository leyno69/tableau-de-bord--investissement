export class InstrumentResolutionError extends Error {
  constructor(message, { code, candidates = [] } = {}) {
    super(message);
    this.name = 'InstrumentResolutionError';
    this.code = code ?? 'INSTRUMENT_RESOLUTION_ERROR';
    this.candidates = Object.freeze([...candidates]);
  }
}

export class InstrumentResolver {
  constructor({ instrumentRepository, provider, clock = () => new Date() }) {
    requireMethod(instrumentRepository, 'findByAnyIdentifier', 'instrumentRepository');
    this.instrumentRepository = instrumentRepository;
    this.provider = requiredText(provider, 'provider');
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
    this.clock = clock;
  }

  async resolve(identifier) {
    const normalized = requiredText(identifier, 'identifier');
    const matches = await this.instrumentRepository.findByAnyIdentifier(normalized);
    if (!Array.isArray(matches)) throw new TypeError('findByAnyIdentifier() doit retourner un tableau.');
    if (matches.length === 0) throw new InstrumentResolutionError(`Instrument introuvable pour "${normalized}".`, { code: 'INSTRUMENT_NOT_FOUND' });
    if (matches.length > 1) throw new InstrumentResolutionError(`Plusieurs instruments correspondent à "${normalized}".`, { code: 'INSTRUMENT_AMBIGUOUS', candidates: matches.map(item => item.id) });

    const instrument = matches[0];
    const mapping = instrument.getProviderMapping(this.provider, this.clock().toISOString());
    if (mapping == null) {
      throw new InstrumentResolutionError(`Aucun symbole ${this.provider} actif pour "${instrument.id}".`, { code: 'PROVIDER_SYMBOL_NOT_FOUND' });
    }

    return Object.freeze({ instrument, provider: this.provider, symbol: mapping.symbol, externalId: mapping.externalId });
  }

  async resolveSymbol(identifier) {
    return (await this.resolve(identifier)).symbol;
  }
}

function requireMethod(value, method, field) { if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
function requiredText(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
