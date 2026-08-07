import { MarketQuote } from '../../domain/market-data/MarketQuote.js';

/**
 * Récupère une cotation et applique explicitement la politique de fraîcheur.
 */
export class GetFreshMarketQuote {
  constructor({ marketDataProvider, clock = () => new Date().toISOString() }) {
    if (!marketDataProvider || typeof marketDataProvider.getQuote !== 'function') {
      throw new TypeError('marketDataProvider doit implémenter getQuote().');
    }
    if (typeof clock !== 'function') {
      throw new TypeError('clock doit être une fonction.');
    }
    this.marketDataProvider = marketDataProvider;
    this.clock = clock;
  }

  async execute({ assetId, maxAgeMilliseconds, allowStale = false }) {
    const quote = await this.marketDataProvider.getQuote(assetId);
    if (!(quote instanceof MarketQuote)) {
      throw new TypeError('Le fournisseur doit retourner une instance de MarketQuote.');
    }

    const referenceTime = this.clock();
    const fresh = quote.isFresh({ referenceTime, maxAgeMilliseconds });
    if (!fresh && !allowStale) {
      throw new RangeError(
        `La cotation de ${quote.assetId} est périmée depuis ${quote.ageInMilliseconds(referenceTime)} ms.`
      );
    }

    return Object.freeze({
      quote,
      fresh,
      ageMilliseconds: quote.ageInMilliseconds(referenceTime)
    });
  }
}
