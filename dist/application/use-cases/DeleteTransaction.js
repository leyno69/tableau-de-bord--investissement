export class DeleteTransaction {
  constructor(transactionRepository) {
    if (
      !transactionRepository ||
      typeof transactionRepository.findById !== 'function' ||
      typeof transactionRepository.deleteById !== 'function'
    ) {
      throw new TypeError(
        'transactionRepository doit fournir findById() et deleteById().'
      );
    }

    this.transactionRepository = transactionRepository;
  }

  execute(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('id doit être une chaîne non vide.');
    }

    const normalizedId = id.trim();
    const transaction = this.transactionRepository.findById(normalizedId);

    if (transaction === null) {
      throw new Error(`Transaction introuvable : ${normalizedId}.`);
    }

    const deleted = this.transactionRepository.deleteById(normalizedId);

    if (!deleted) {
      throw new Error(
        `La suppression de la transaction ${normalizedId} a échoué.`
      );
    }

    return transaction;
  }
}
