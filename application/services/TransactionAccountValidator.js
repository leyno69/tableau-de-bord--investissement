import { Account } from '../../domain/account/Account.js';

/**
 * Vérifie qu'une transaction référence un compte utilisable du même portefeuille.
 *
 * Cette règle appartient à l'application : elle nécessite de consulter un dépôt,
 * mais ne dépend ni de son implémentation ni d'un connecteur de courtier.
 */
export class TransactionAccountValidator {
  constructor({ accountRepository }) {
    if (!accountRepository) {
      throw new TypeError('accountRepository est obligatoire.');
    }

    if (typeof accountRepository.findById !== 'function') {
      throw new TypeError('accountRepository doit implémenter la méthode findById().');
    }

    this.accountRepository = accountRepository;
  }

  validate(transaction) {
    TransactionAccountValidator.#requireTransactionReference(transaction);

    const account = this.accountRepository.findById(transaction.accountId);

    if (account == null) {
      throw new RangeError(
        `Le compte "${transaction.accountId}" référencé par la transaction est introuvable.`
      );
    }

    if (!(account instanceof Account)) {
      throw new TypeError('findById() doit retourner une instance de Account ou null.');
    }

    if (account.portfolioId !== transaction.portfolioId) {
      throw new RangeError(
        `Le compte "${account.id}" n'appartient pas au portefeuille "${transaction.portfolioId}".`
      );
    }

    if (!account.isActive) {
      throw new RangeError(
        `Le compte "${account.id}" est fermé et ne peut pas recevoir de nouvelle transaction.`
      );
    }

    return account;
  }

  static #requireTransactionReference(transaction) {
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
      throw new TypeError('transaction est obligatoire.');
    }

    for (const fieldName of ['portfolioId', 'accountId']) {
      const value = transaction[fieldName];

      if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`transaction.${fieldName} doit être une chaîne non vide.`);
      }
    }
  }
}
