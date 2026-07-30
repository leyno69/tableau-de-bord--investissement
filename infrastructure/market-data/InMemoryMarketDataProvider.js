import { MarketQuote } from '../../domain/market-data/MarketQuote.js';

/**
 * Adaptateur déterministe pour les tests, les simulations et le développement local.
 * Implémente prix courant et historique sans dépendance réseau.
 */
export class InMemoryMarketDataProvider {
  constructor(quotes = []) {
    this.quotesByAsset = new Map();
    for (const quote of quotes) {
      this.addQuote(quote);
    }
  }

  addQuote(quote) {
    if (!(quote instanceof MarketQuote)) {
      throw new TypeError('quote doit être une instance de MarketQuote.');
    }
    const history = this.quotesByAsset.get(quote.assetId) ?? [];
    history.push(quote);
    history.sort((left, right) => Date.parse(left.quotedAt) - Date.parse(right.quotedAt));
    this.quotesByAsset.set(quote.assetId, history);
  }

  async getQuote(assetId) {
    const history = this.#history(assetId);
    if (history.length === 0) {
      throw new RangeError(`Aucune cotation disponible pour ${assetId}.`);
    }
    return history.at(-1);
  }

  async getPrice(assetId) {
    return (await this.getQuote(assetId)).price;
  }

  async getHistory(assetId, { from = null, to = null } = {}) {
    const fromTime = from == null ? -Infinity : InMemoryMarketDataProvider.#parseInstant(from, 'from');
    const toTime = to == null ? Infinity : InMemoryMarketDataProvider.#parseInstant(to, 'to');
    if (fromTime > toTime) {
      throw new RangeError('from doit être antérieur ou égal à to.');
    }
    return Object.freeze(this.#history(assetId).filter(quote => {
      const time = Date.parse(quote.quotedAt);
      return time >= fromTime && time <= toTime;
    }));
  }

  #history(assetId) {
    if (typeof assetId !== 'string' || assetId.trim() === '') {
      throw new TypeError('assetId doit être une chaîne non vide.');
    }
    return [...(this.quotesByAsset.get(assetId.trim()) ?? [])];
  }

  static #parseInstant(value, fieldName) {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) {
      throw new TypeError(`${fieldName} doit être un instant ISO valide.`);
    }
    return time;
  }
}
