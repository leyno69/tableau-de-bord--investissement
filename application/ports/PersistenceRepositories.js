/**
 * Contrats documentaires des dépôts applicatifs.
 *
 * Les implémentations concrètes peuvent être en mémoire, SQL, documentaires ou
 * distantes. Les cas d’usage ne dépendent que de ces méthodes.
 */
export class TransactionRepository {
  async save(_transaction) { throw new Error('TransactionRepository.save() non implémenté.'); }
  async findById(_id) { throw new Error('TransactionRepository.findById() non implémenté.'); }
  async listByPortfolio(_portfolioId) { throw new Error('TransactionRepository.listByPortfolio() non implémenté.'); }
}

export class PortfolioSnapshotRepository {
  async save(_snapshot) { throw new Error('PortfolioSnapshotRepository.save() non implémenté.'); }
  async listByPortfolio(_portfolioId, _range = {}) { throw new Error('PortfolioSnapshotRepository.listByPortfolio() non implémenté.'); }
}

export class AlertEventRepository {
  async saveAll(_events) { throw new Error('AlertEventRepository.saveAll() non implémenté.'); }
  async listByPortfolio(_portfolioId) { throw new Error('AlertEventRepository.listByPortfolio() non implémenté.'); }
  async listFingerprints(_portfolioId) { throw new Error('AlertEventRepository.listFingerprints() non implémenté.'); }
}

export class PortfolioPreferencesRepository {
  async save(_preferences) { throw new Error('PortfolioPreferencesRepository.save() non implémenté.'); }
  async findByPortfolio(_portfolioId) { throw new Error('PortfolioPreferencesRepository.findByPortfolio() non implémenté.'); }
}
