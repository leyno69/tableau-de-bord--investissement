import { Transaction } from '../../domain/transaction/Transaction.js';
import { TransactionAccountValidator } from '../services/TransactionAccountValidator.js';

/**
 * Construit, valide puis persiste une transaction.
 *
 * Ce cas d'usage constitue le point d'entrée applicatif pour les saisies
 * manuelles et les futurs connecteurs de courtier.
 */
export class RegisterTransaction {
  constructor({ transactionRepository, accountRepository }) {
    if (!transactionRepository) {
      throw new TypeError('transactionRepository est obligatoire.');
    }

    if (typeof transactionRepository.save !== 'function') {
      throw new TypeError(
        'transactionRepository doit implémenter la méthode save().'
      );
    }

    this.transactionRepository = transactionRepository;
    this.accountValidator = new TransactionAccountValidator({
      accountRepository
    });
  }

  execute(properties) {
    const transaction = properties instanceof Transaction
      ? properties
      : new Transaction(properties);

    this.accountValidator.validate(transaction);

    const persistedTransaction = this.transactionRepository.save(transaction);

    if (persistedTransaction !== undefined && !(persistedTransaction instanceof Transaction)) {
      throw new TypeError(
        'save() doit retourner une instance de Transaction ou undefined.'
      );
    }

    return persistedTransaction ?? transaction;
  }
}
