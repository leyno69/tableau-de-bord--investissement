import { Transaction } from '../../domain/transaction/Transaction.js';

/**
 * Cas d'usage chargé de valider et d'enregistrer une nouvelle transaction.
 *
 * Il orchestre le domaine et le dépôt sans dépendre de l'interface utilisateur
 * ni de la technologie de stockage employée.
 */
export class AddTransaction {
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

  async execute(properties) {
    const transaction =
      properties instanceof Transaction
        ? properties
        : new Transaction(properties);

    if (await this.transactionRepository.findById(transaction.id)) {
      throw new Error(
        `Une transaction avec l'identifiant "${transaction.id}" existe déjà.`
      );
    }

    return this.transactionRepository.save(transaction);
  }
}
