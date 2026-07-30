import { Transaction } from '../transaction/Transaction.js';

const PRECISION = 10;

/**
 * Reconstruit les soldes de trésorerie à partir des transactions confirmées.
 *
 * Le ledger est déterministe et ne persiste aucun état. Les montants autonomes
 * (dépôt, retrait, frais et taxe) sont portés par unitPrice.
 */
export class CashLedger {
  /**
   * @param {Transaction[]} transactions
   * @returns {ReadonlyArray<{portfolioId: string, accountId: string, currency: string, balance: number}>}
   */
  static rebuildBalances(transactions) {
    CashLedger.#requireTransactionArray(transactions);

    const balances = new Map();
    const orderedTransactions = [...transactions].sort(CashLedger.#compareTransactions);

    for (const transaction of orderedTransactions) {
      CashLedger.#requireTransaction(transaction);

      if (!transaction.isConfirmed) {
        continue;
      }

      const key = CashLedger.#balanceKey(transaction);
      const current = balances.get(key) ?? {
        portfolioId: transaction.portfolioId,
        accountId: transaction.accountId,
        currency: transaction.currency,
        balance: 0
      };

      current.balance = CashLedger.#round(
        current.balance + CashLedger.cashDelta(transaction)
      );
      balances.set(key, current);
    }

    return Object.freeze(
      [...balances.values()]
        .map(balance => Object.freeze({ ...balance }))
        .sort((left, right) =>
          left.accountId.localeCompare(right.accountId) ||
          left.currency.localeCompare(right.currency)
        )
    );
  }

  /**
   * Calcule l'impact espèces d'une transaction confirmée ou non.
   *
   * @param {Transaction} transaction
   * @returns {number}
   */
  static cashDelta(transaction) {
    CashLedger.#requireTransaction(transaction);

    switch (transaction.type) {
      case Transaction.TYPES.BUY:
        return CashLedger.#round(-transaction.totalCost);
      case Transaction.TYPES.SELL:
        return CashLedger.#round(transaction.netProceeds);
      case Transaction.TYPES.DIVIDEND:
        return CashLedger.#round(
          CashLedger.#standaloneAmount(transaction) - transaction.fees - transaction.taxes
        );
      case Transaction.TYPES.DEPOSIT:
        return CashLedger.#round(
          transaction.unitPrice - transaction.fees - transaction.taxes
        );
      case Transaction.TYPES.WITHDRAWAL:
        return CashLedger.#round(
          -(transaction.unitPrice + transaction.fees + transaction.taxes)
        );
      case Transaction.TYPES.FEE:
        return CashLedger.#round(-transaction.unitPrice);
      case Transaction.TYPES.TAX:
        return CashLedger.#round(-transaction.unitPrice);
      default:
        return 0;
    }
  }

  static #standaloneAmount(transaction) {
    return transaction.quantity > 0
      ? transaction.grossAmount
      : transaction.unitPrice;
  }

  static #balanceKey(transaction) {
    return [
      transaction.portfolioId,
      transaction.accountId,
      transaction.currency
    ].join(':');
  }

  static #compareTransactions(left, right) {
    const dateDifference = Date.parse(left.executedAt) - Date.parse(right.executedAt);
    return dateDifference !== 0 ? dateDifference : left.id.localeCompare(right.id);
  }

  static #requireTransactionArray(transactions) {
    if (!Array.isArray(transactions)) {
      throw new TypeError('transactions doit être un tableau.');
    }
  }

  static #requireTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new TypeError('Chaque élément doit être une instance de Transaction.');
    }
  }

  static #round(value) {
    const factor = 10 ** PRECISION;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
