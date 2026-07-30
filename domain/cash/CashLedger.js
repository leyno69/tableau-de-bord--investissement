import { Money } from '../money/Money.js';
import { Transaction } from '../transaction/Transaction.js';

/**
 * Reconstruit les soldes de trésorerie à partir des transactions confirmées.
 *
 * Le cœur du ledger manipule Money. Les méthodes historiques retournant des
 * nombres restent disponibles comme adaptateurs temporaires de compatibilité.
 */
export class CashLedger {
  /**
   * Contrat historique conservé pendant la migration.
   *
   * @param {Transaction[]} transactions
   * @returns {ReadonlyArray<{portfolioId: string, accountId: string, currency: string, balance: number}>}
   */
  static rebuildBalances(transactions) {
    return Object.freeze(
      CashLedger.rebuildMoneyBalances(transactions).map(entry => Object.freeze({
        portfolioId: entry.portfolioId,
        accountId: entry.accountId,
        currency: entry.balance.currency,
        balance: entry.balance.amount
      }))
    );
  }

  /**
   * Reconstruit les soldes avec une représentation monétaire explicite.
   *
   * @param {Transaction[]} transactions
   * @returns {ReadonlyArray<{portfolioId: string, accountId: string, balance: Money}>}
   */
  static rebuildMoneyBalances(transactions) {
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
        balance: Money.zero(transaction.currency)
      };

      balances.set(key, {
        ...current,
        balance: current.balance.add(CashLedger.cashDeltaMoney(transaction))
      });
    }

    return Object.freeze(
      [...balances.values()]
        .map(entry => Object.freeze({ ...entry }))
        .sort((left, right) =>
          left.accountId.localeCompare(right.accountId) ||
          left.balance.currency.localeCompare(right.balance.currency)
        )
    );
  }

  /**
   * Contrat historique conservé pendant la migration.
   *
   * @param {Transaction} transaction
   * @returns {number}
   */
  static cashDelta(transaction) {
    return CashLedger.cashDeltaMoney(transaction).amount;
  }

  /**
   * Calcule l'impact espèces dans la devise native de la transaction.
   *
   * @param {Transaction} transaction
   * @returns {Money}
   */
  static cashDeltaMoney(transaction) {
    CashLedger.#requireTransaction(transaction);

    const money = amount => new Money(amount, transaction.currency);
    const fees = money(transaction.fees);
    const taxes = money(transaction.taxes);

    switch (transaction.type) {
      case Transaction.TYPES.BUY:
        return money(transaction.grossAmount).add(fees).add(taxes).negate();
      case Transaction.TYPES.SELL:
        return money(transaction.grossAmount).subtract(fees).subtract(taxes);
      case Transaction.TYPES.DIVIDEND:
        return money(CashLedger.#standaloneAmount(transaction)).subtract(fees).subtract(taxes);
      case Transaction.TYPES.DEPOSIT:
        return money(transaction.unitPrice).subtract(fees).subtract(taxes);
      case Transaction.TYPES.WITHDRAWAL:
        return money(transaction.unitPrice).add(fees).add(taxes).negate();
      case Transaction.TYPES.FEE:
      case Transaction.TYPES.TAX:
        return money(transaction.unitPrice).negate();
      default:
        return Money.zero(transaction.currency);
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
}
