/**
 * Instrument financier identifié indépendamment de ses tickers fournisseurs.
 *
 * L'identifiant interne reste stable même lorsqu'un symbole, une place de
 * cotation ou un fournisseur change dans le temps.
 */
export class Instrument {
  static TYPES = Object.freeze({
    STOCK: 'stock',
    ETF: 'etf',
    FUND: 'fund',
    BOND: 'bond',
    INDEX: 'index',
    CRYPTO: 'crypto',
    OTHER: 'other'
  });

  constructor({
    id,
    type,
    name,
    isin = null,
    ticker = null,
    venue = null,
    currency = 'EUR',
    providerMappings = []
  }) {
    this.id = Instrument.#requireString(id, 'id');
    this.type = Instrument.#requireEnumValue(
      type,
      Object.values(Instrument.TYPES),
      'type'
    );
    this.name = Instrument.#requireString(name, 'name');
    this.isin = Instrument.#optionalIsin(isin);
    this.ticker = Instrument.#optionalString(ticker);
    this.venue = Instrument.#optionalString(venue);
    this.currency = Instrument.#requireCurrency(currency);
    this.providerMappings = Instrument.#createProviderMappings(
      providerMappings
    );

    Object.freeze(this);
  }

  getProviderMapping(provider, at = null) {
    const providerId = Instrument.#requireString(provider, 'provider');
    const instant = at == null ? null : Instrument.#requireIsoDate(at, 'at');

    const matches = this.providerMappings.filter(mapping => {
      if (mapping.provider !== providerId) return false;
      if (instant === null) return mapping.validTo === null;
      if (mapping.validFrom !== null && instant < mapping.validFrom) return false;
      if (mapping.validTo !== null && instant >= mapping.validTo) return false;
      return true;
    });

    if (matches.length > 1) {
      throw new Error(
        `Plusieurs mappings actifs existent pour le fournisseur "${providerId}".`
      );
    }

    return matches[0] ?? null;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      isin: this.isin,
      ticker: this.ticker,
      venue: this.venue,
      currency: this.currency,
      providerMappings: this.providerMappings.map(mapping => ({
        ...mapping
      }))
    };
  }

  static #createProviderMappings(value) {
    if (!Array.isArray(value)) {
      throw new TypeError('providerMappings doit être un tableau.');
    }

    const mappings = value.map((mapping, index) => {
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        throw new TypeError(
          `providerMappings[${index}] doit être un objet.`
        );
      }

      const normalized = {
        provider: Instrument.#requireString(
          mapping.provider,
          `providerMappings[${index}].provider`
        ),
        symbol: Instrument.#requireString(
          mapping.symbol,
          `providerMappings[${index}].symbol`
        ),
        externalId: Instrument.#optionalString(mapping.externalId),
        validFrom:
          mapping.validFrom == null
            ? null
            : Instrument.#requireIsoDate(
                mapping.validFrom,
                `providerMappings[${index}].validFrom`
              ),
        validTo:
          mapping.validTo == null
            ? null
            : Instrument.#requireIsoDate(
                mapping.validTo,
                `providerMappings[${index}].validTo`
              )
      };

      if (
        normalized.validFrom !== null &&
        normalized.validTo !== null &&
        normalized.validFrom >= normalized.validTo
      ) {
        throw new RangeError(
          `providerMappings[${index}].validTo doit être postérieur à validFrom.`
        );
      }

      return Object.freeze(normalized);
    });

    Instrument.#assertNoOverlappingMappings(mappings);
    return Object.freeze(mappings);
  }

  static #assertNoOverlappingMappings(mappings) {
    const byProvider = new Map();

    for (const mapping of mappings) {
      if (!byProvider.has(mapping.provider)) {
        byProvider.set(mapping.provider, []);
      }
      byProvider.get(mapping.provider).push(mapping);
    }

    for (const [provider, providerMappings] of byProvider) {
      const sorted = [...providerMappings].sort((left, right) =>
        (left.validFrom ?? '').localeCompare(right.validFrom ?? '')
      );

      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        const previousEnd = previous.validTo;
        const currentStart = current.validFrom;

        if (
          previousEnd === null ||
          currentStart === null ||
          currentStart < previousEnd
        ) {
          throw new RangeError(
            `Les mappings du fournisseur "${provider}" ne doivent pas se chevaucher.`
          );
        }
      }
    }
  }

  static #optionalIsin(value) {
    if (value == null) return null;
    const isin = Instrument.#requireString(value, 'isin').toUpperCase();

    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
      throw new TypeError('isin doit respecter le format ISO 6166.');
    }

    return isin;
  }

  static #optionalString(value) {
    return value == null ? null : Instrument.#requireString(value, 'value');
  }

  static #requireCurrency(value) {
    const currency = Instrument.#requireString(value, 'currency').toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new TypeError(
        'currency doit être un code composé de trois lettres.'
      );
    }

    return currency;
  }

  static #requireIsoDate(value, fieldName) {
    const text = Instrument.#requireString(value, fieldName);
    const timestamp = Date.parse(text);

    if (Number.isNaN(timestamp)) {
      throw new TypeError(`${fieldName} doit contenir une date ISO valide.`);
    }

    return new Date(timestamp).toISOString();
  }

  static #requireEnumValue(value, allowedValues, fieldName) {
    if (!allowedValues.includes(value)) {
      throw new TypeError(
        `${fieldName} doit être l'une des valeurs suivantes : ${allowedValues.join(', ')}.`
      );
    }

    return value;
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }

    return value.trim();
  }
}
