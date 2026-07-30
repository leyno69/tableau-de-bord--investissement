import { Position } from '../../domain/position/Position.js';

/**
 * Charge une cotation par actif effectivement détenu.
 *
 * Le mode strict conserve le comportement historique. Le mode partiel retourne
 * les cotations disponibles et un diagnostic stable pour chaque actif en échec.
 */
export class LoadPortfolioMarketQuotes {
  constructor({ marketDataProvider }) {
    if (!marketDataProvider || typeof marketDataProvider.getQuote !== 'function') {
      throw new TypeError('marketDataProvider doit implémenter getQuote().');
    }
    this.marketDataProvider = marketDataProvider;
  }

  async execute({ positions, policy = 'strict' }) {
    const result = await this.executeDetailed({ positions, policy });
    return result.quotes;
  }

  async executeDetailed({ positions, policy = 'strict' }) {
    if (!Array.isArray(positions)) throw new TypeError('positions doit être un tableau.');
    if (!['strict', 'partial'].includes(policy)) throw new RangeError('policy doit valoir "strict" ou "partial".');

    const assetIds = [...new Set(positions.map(position => {
      if (!(position instanceof Position)) {
        throw new TypeError('Chaque position doit être une instance de Position.');
      }
      return position.hasPosition ? position.assetId : null;
    }).filter(Boolean))].sort((left, right) => left.localeCompare(right));

    const settled = await Promise.allSettled(
      assetIds.map(assetId => this.marketDataProvider.getQuote(assetId))
    );
    const quotes = [];
    const issues = [];

    settled.forEach((result, index) => {
      const assetId = assetIds[index];
      if (result.status === 'fulfilled') {
        quotes.push(result.value);
        return;
      }
      if (policy === 'strict') throw result.reason;
      issues.push(issue(assetId, result.reason, 'QUOTE_UNAVAILABLE'));
    });

    return Object.freeze({
      quotes: Object.freeze(quotes),
      issues: Object.freeze(issues),
      requested: assetIds.length,
      loaded: quotes.length,
      complete: issues.length === 0
    });
  }
}

function issue(assetId, error, fallbackCode) {
  return Object.freeze({
    assetId,
    stage: 'QUOTE',
    code: typeof error?.code === 'string' ? error.code : fallbackCode,
    message: error instanceof Error ? error.message : 'Cotation indisponible.'
  });
}
