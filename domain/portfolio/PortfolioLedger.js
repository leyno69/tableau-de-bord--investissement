import { Position } from '../position/Position.js';
import { Transaction } from '../transaction/Transaction.js';

const PRECISION = 10;

/**
 * Reconstruit des positions à partir de transactions confirmées.
 *
 * Le ledger ne persiste aucun état : à entrée identique, il produit
 * toujours exactement le même résultat.
 */
export class PortfolioLedger {
  /**
   * Reconstruit toutes les positions présentes dans un historique.
   *
   * @param {Transaction[]} transactions
   * @returns {Position[]}
   */
  static rebuildPositions(transactions) {
    PortfolioLedger.#requireTransactionArray(transactions);

    const states = new Map();
    const orderedTransactions = [...transactions].sort(
      PortfolioLedger.#compareTransactions
    );

    for (const transaction of orderedTransactions) {
      PortfolioLedger.#requireTransaction(transaction);

      if (!transaction.isConfirmed || transaction.assetId === null) {
        continue;
      }

      const key = PortfolioLedger.#positionKey(transaction);
      const state = states.get(key) ??
        PortfolioLedger.#createEmptyState(transaction);

      PortfolioLedger.#assertCurrency(state, transaction);
      PortfolioLedger.#applyTransaction(state, transaction);
      states.set(key, state);
    }

    return [...states.values()]
      .map(PortfolioLedger.#toPosition)
      .sort((left, right) =>
        left.assetId.localeCompare(right.assetId)
      );
  }

  /**
   * Reconstruit une position précise.
   *
   * @param {object} input
   * @param {Transaction[]} input.transactions
   * @param {string} input.portfolioId
   * @param {string} input.accountId
   * @param {string} input.assetId
   * @returns {Position}
   */
  static rebuildPosition({
    transactions,
    portfolioId,
    accountId,
    assetId
  }) {
    PortfolioLedger.#requireIdentifier(portfolioId, 'portfolioId');
    PortfolioLedger.#requireIdentifier(accountId, 'accountId');
    PortfolioLedger.#requireIdentifier(assetId, 'assetId');

    const relevantTransactions = transactions.filter(
      transaction =>
        transaction.portfolioId === portfolioId &&
        transaction.accountId === accountId &&
        transaction.assetId === assetId
    );

    const [position] = PortfolioLedger.rebuildPositions(
      relevantTransactions
    );

    return position ??
      new Position({
        assetId,
        currency: 'EUR'
      });
  }

  static #applyTransaction(state, transaction) {
    switch (transaction.type) {
      case Transaction.TYPES.BUY:
        PortfolioLedger.#applyBuy(state, transaction);
        break;

      case Transaction.TYPES.SELL:
        PortfolioLedger.#applySell(state, transaction);
        break;

      case Transaction.TYPES.DIVIDEND:
        PortfolioLedger.#applyDividend(state, transaction);
        break;

      default:
        break;
    }
  }

  static #applyBuy(state, transaction) {
    state.quantity = PortfolioLedger.#round(
      state.quantity + transaction.quantity
    );

    state.totalCost = PortfolioLedger.#round(
      state.totalCost + transaction.totalCost
    );

    state.averageCost = state.quantity > 0
      ? PortfolioLedger.#round(
          state.totalCost / state.quantity
        )
      : 0;
  }

  static #applySell(state, transaction) {
    if (transaction.quantity > state.quantity) {
      throw new RangeError(
        `La vente ${transaction.id} dépasse la quantité détenue pour ${transaction.assetId}.`
      );
    }

    const removedCost = PortfolioLedger.#round(
      state.averageCost * transaction.quantity
    );

    state.quantity = PortfolioLedger.#round(
      state.quantity - transaction.quantity
    );

    state.totalCost = PortfolioLedger.#round(
      state.totalCost - removedCost
    );

    state.realizedPnL = PortfolioLedger.#round(
      state.realizedPnL +
        transaction.netProceeds -
        removedCost
    );

    if (state.quantity === 0) {
      state.totalCost = 0;
      state.averageCost = 0;
      return;
    }

    state.averageCost = PortfolioLedger.#round(
      state.totalCost / state.quantity
    );
  }

  static #applyDividend(state, transaction) {
    const grossDividend = transaction.quantity > 0
      ? transaction.grossAmount
      : transaction.unitPrice;

    const netDividend = PortfolioLedger.#round(
      grossDividend - transaction.fees - transaction.taxes
    );

    state.dividends = PortfolioLedger.#round(
      state.dividends + netDividend
    );
  }

  static #createEmptyState(transaction) {
    return {
      assetId: transaction.assetId,
      quantity: 0,
      totalCost: 0,
      averageCost: 0,
      realizedPnL: 0,
      dividends: 0,
      currency: transaction.currency
    };
  }

  static #toPosition(state) {
    return new Position({ ...state });
  }

  static #positionKey(transaction) {
    return [
      transaction.portfolioId,
      transaction.accountId,
      transaction.assetId
    ].join(':');
  }

  static #compareTransactions(left, right) {
    const dateDifference =
      Date.parse(left.executedAt) - Date.parse(right.executedAt);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return left.id.localeCompare(right.id);
  }

  static #assertCurrency(state, transaction) {
    if (state.currency !== transaction.currency) {
      throw new TypeError(
        `La position ${transaction.assetId} mélange les devises ${state.currency} et ${transaction.currency}.`
      );
    }
  }

  static #requireTransactionArray(transactions) {
    if (!Array.isArray(transactions)) {
      throw new TypeError(
        'transactions doit être un tableau.'
      );
    }
  }

  static #requireTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new TypeError(
        'Chaque élément doit être une instance de Transaction.'
      );
    }
  }

  static #requireIdentifier(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(
        `${fieldName} doit être une chaîne non vide.`
      );
    }
  }

  static #round(value) {
    const factor = 10 ** PRECISION;

    return Math.round(
      (value + Number.EPSILON) * factor
    ) / factor;
  }
}
