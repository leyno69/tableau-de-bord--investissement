import { Transaction } from '../../domain/transaction/Transaction.js';

/**
 * Cas d'usage chargé de modifier une transaction existante.
 *
 * L'identifiant et la date de création sont conservés. Toutes les autres
 * propriétés sont reconstruites dans une nouvelle entité Transaction afin que
 * les invariants métier soient systématiquement revérifiés.
 */
export class UpdateTransaction {
  constructor({ transactionRepository }) {
    if (!transactionRepository) {
      throw new TypeError('transactionRepository est obligatoire.');
    }

    const requiredMethods = ['save', 'findById'];

    for (const method of requiredMethods) {
      if (typeof transactionRepository[method] !== 'function') {
        throw new TypeError(
          `transactionRepository doit implémenter la méthode ${method}().`
        );
      }
    }

    this.transactionRepository = transactionRepository;
  }

  execute(id, changes) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('id doit être une chaîne non vide.');
    }

    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      throw new TypeError('changes doit être un objet.');
    }

    const normalizedId = id.trim();
    const existingTransaction = this.transactionRepository.findById(normalizedId);

    if (!existingTransaction) {
      throw new Error(
        `La transaction avec l'identifiant "${normalizedId}" est introuvable.`
      );
    }

    const updatedTransaction = new Transaction({
      ...existingTransaction.toJSON(),
      ...changes,
      id: existingTransaction.id,
      createdAt: existingTransaction.createdAt
    });

    return this.transactionRepository.save(updatedTransaction);
  }
}
