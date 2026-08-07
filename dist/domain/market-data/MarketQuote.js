import { Money } from '../money/Money.js';

/**
 * Cotation de marché immuable et traçable.
 */
export class MarketQuote {
  constructor({ assetId, price, quotedAt, source }) {
    this.assetId = MarketQuote.#requireString(assetId, 'assetId');
    if (!(price instanceof Money) || price.amount <= 0) {
      throw new TypeError('price doit être une instance positive de Money.');
    }
    this.price = price;
    this.quotedAt = MarketQuote.#requireInstant(quotedAt, 'quotedAt');
    this.source = MarketQuote.#requireString(source, 'source');
    Object.freeze(this);
  }

  ageInMilliseconds(referenceTime = new Date().toISOString()) {
    const reference = Date.parse(MarketQuote.#requireInstant(referenceTime, 'referenceTime'));
    return Math.max(0, reference - Date.parse(this.quotedAt));
  }

  isFresh({ referenceTime = new Date().toISOString(), maxAgeMilliseconds }) {
    const maxAge = Number(maxAgeMilliseconds);
    if (!Number.isFinite(maxAge) || maxAge < 0) {
      throw new RangeError('maxAgeMilliseconds doit être positif ou nul.');
    }
    return this.ageInMilliseconds(referenceTime) <= maxAge;
  }

  toJSON() {
    return {
      assetId: this.assetId,
      price: this.price.toJSON(),
      quotedAt: this.quotedAt,
      source: this.source
    };
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }
    return value.trim();
  }

  static #requireInstant(value, fieldName) {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
      throw new TypeError(`${fieldName} doit être un instant ISO valide.`);
    }
    return new Date(value).toISOString();
  }
}
