import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

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

  execute(portfolioId, { context = Transaction.CONTEXTS.REAL } = {}) {
    const normalizedPortfolioId = RebuildPortfolio.#requirePortfolioId(
      portfolioId
    );
    const normalizedContext = RebuildPortfolio.#requireContext(context);
    const transactions = this.transactionRepository.findByPortfolioId(
      normalizedPortfolioId
    );

    if (!Array.isArray(transactions)) {
      throw new TypeError(
        'findByPortfolioId() doit retourner un tableau de transactions.'
      );
    }

    const orderedTransactions = transactions
      .filter(transaction => transaction.context === normalizedContext)
      .sort(RebuildPortfolio.#compareTransactions);
    const positions = PortfolioLedger.rebuildPositions(orderedTransactions);

    return Object.freeze({
      portfolioId: normalizedPortfolioId,
      context: normalizedContext,
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

  static #requireContext(value) {
    if (!Object.values(Transaction.CONTEXTS).includes(value)) {
      throw new TypeError(
        `context doit être l'une des valeurs suivantes : ${Object.values(Transaction.CONTEXTS).join(', ')}.`
      );
    }

    return value;
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
