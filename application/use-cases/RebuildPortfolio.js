import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';

/**
 * Reconstruit un portefeuille à partir de son historique de transactions.
 *
 * Les transactions restent la source de vérité : aucune position persistée
 * n'est utilisée par ce cas d'usage.
 */
export class RebuildPortfolio {
  constructor({ transactionRepository }) {
    if (!transactionRepository) {
      throw new TypeError('transactionRepository est obligatoire.');
    }

    if (typeof transactionRepository.findByPortfolioId !== 'function') {
      throw new TypeError(
        'transactionRepository doit implémenter la méthode findByPortfolioId().'
      );
    }

    this.transactionRepository = transactionRepository;
  }

  execute(portfolioId) {
    const normalizedPortfolioId = RebuildPortfolio.#requirePortfolioId(
      portfolioId
    );
    const transactions = this.transactionRepository.findByPortfolioId(
      normalizedPortfolioId
    );

    if (!Array.isArray(transactions)) {
      throw new TypeError(
        'findByPortfolioId() doit retourner un tableau de transactions.'
      );
    }

    const orderedTransactions = [...transactions].sort(
      RebuildPortfolio.#compareTransactions
    );
    const positions = PortfolioLedger.rebuildPositions(orderedTransactions);

    return Object.freeze({
      portfolioId: normalizedPortfolioId,
      transactions: Object.freeze(orderedTransactions),
      positions: Object.freeze(positions)
    });
  }

  static #requirePortfolioId(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError('portfolioId doit être une chaîne non vide.');
    }

    return value.trim();
  }

  static #compareTransactions(left, right) {
    const dateDifference =
      Date.parse(left.executedAt) - Date.parse(right.executedAt);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return left.id.localeCompare(right.id);
  }
}
