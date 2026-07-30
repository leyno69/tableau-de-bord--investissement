import { Position } from '../../domain/position/Position.js';

/**
 * Charge une cotation par actif effectivement détenu.
 *
 * Les positions fermées sont ignorées et les identifiants dupliqués ne
 * provoquent qu'un seul appel au fournisseur. L'ordre de sortie reste
 * déterministe afin de faciliter les tests et la sérialisation.
 */
export class LoadPortfolioMarketQuotes {
  constructor({ marketDataProvider }) {
    if (!marketDataProvider || typeof marketDataProvider.getQuote !== 'function') {
      throw new TypeError('marketDataProvider doit implémenter getQuote().');
    }
    this.marketDataProvider = marketDataProvider;
  }

  async execute({ positions }) {
    if (!Array.isArray(positions)) throw new TypeError('positions doit être un tableau.');

    const assetIds = [...new Set(positions.map(position => {
      if (!(position instanceof Position)) {
        throw new TypeError('Chaque position doit être une instance de Position.');
      }
      return position.hasPosition ? position.assetId : null;
    }).filter(Boolean))].sort((left, right) => left.localeCompare(right));

    return Object.freeze(await Promise.all(
      assetIds.map(assetId => this.marketDataProvider.getQuote(assetId))
    ));
  }
}
