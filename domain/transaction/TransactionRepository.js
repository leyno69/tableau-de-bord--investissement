/**
 * Contrat de persistance des transactions.
 *
 * Le domaine définit les opérations dont il a besoin sans connaître
 * l'implémentation concrète utilisée par l'application.
 */
export class TransactionRepository {
  save(_transaction) {
    throw new Error('TransactionRepository.save doit être implémentée.');
  }

  findById(_id) {
    throw new Error('TransactionRepository.findById doit être implémentée.');
  }

  findAll() {
    throw new Error('TransactionRepository.findAll doit être implémentée.');
  }

  findByPortfolioId(_portfolioId) {
    throw new Error(
      'TransactionRepository.findByPortfolioId doit être implémentée.'
    );
  }

  deleteById(_id) {
    throw new Error('TransactionRepository.deleteById doit être implémentée.');
  }
}
