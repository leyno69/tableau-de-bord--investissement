import { Transaction } from '../../domain/transaction/Transaction.js';

/**
 * Dépôt de transactions conservé uniquement en mémoire.
 *
 * Cette implémentation sert au développement, aux tests et aux premiers
 * branchements de l'application. Elle pourra être remplacée plus tard par
 * SQLite ou une API sans modifier les cas d'usage.
 */
export class InMemoryTransactionRepository {
  #transactions = new Map();

  constructor(initialTransactions = []) {
    if (!Array.isArray(initialTransactions)) {
      throw new TypeError('initialTransactions doit être un tableau.');
    }

    for (const transaction of initialTransactions) {
      this.save(transaction);
    }
  }

  save(transaction) {
    InMemoryTransactionRepository.#requireTransaction(transaction);
    this.#transactions.set(transaction.id, transaction);
    return transaction;
  }

  findById(id) {
    InMemoryTransactionRepository.#requireId(id);
    return this.#transactions.get(id.trim()) ?? null;
  }

  findAll() {
    return [...this.#transactions.values()];
  }

  findByPortfolioId(portfolioId) {
    InMemoryTransactionRepository.#requireId(portfolioId, 'portfolioId');

    return this.findAll().filter(
      (transaction) => transaction.portfolioId === portfolioId.trim()
    );
  }

  deleteById(id) {
    InMemoryTransactionRepository.#requireId(id);
    return this.#transactions.delete(id.trim());
  }

  clear() {
    this.#transactions.clear();
  }

  get size() {
    return this.#transactions.size;
  }

  static #requireTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new TypeError('transaction doit être une instance de Transaction.');
    }
  }

  static #requireId(value, fieldName = 'id') {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }
  }
}
