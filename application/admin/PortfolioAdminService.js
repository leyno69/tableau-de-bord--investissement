import { Portfolio } from '../../domain/portfolio/Portfolio.js';
import { Account } from '../../domain/account/Account.js';

export class PortfolioAdminService {
  constructor({ facade, portfolioRepository = new InMemoryEntityRepository(), accountRepository = new InMemoryEntityRepository() } = {}) {
    for (const method of ['recordTransaction', 'loadPortfolio', 'generateDashboard']) {
      if (!facade || typeof facade[method] !== 'function') throw new TypeError(`facade doit implémenter ${method}().`);
    }
    for (const [repository, field] of [[portfolioRepository, 'portfolioRepository'], [accountRepository, 'accountRepository']]) {
      for (const method of ['save', 'findById', 'list']) if (typeof repository?.[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`);
    }
    this.facade = facade;
    this.portfolioRepository = portfolioRepository;
    this.accountRepository = accountRepository;
  }

  async savePortfolio(input) {
    const portfolio = input instanceof Portfolio ? input : new Portfolio(input);
    return this.portfolioRepository.save(portfolio);
  }

  async listPortfolios() { return this.portfolioRepository.list(); }

  async saveAccount(input) {
    const account = input instanceof Account ? input : new Account(input);
    const portfolio = await this.portfolioRepository.findById(account.portfolioId);
    if (portfolio == null) throw new RangeError(`Le portefeuille ${account.portfolioId} n'existe pas.`);
    return this.accountRepository.save(account);
  }

  async listAccounts(portfolioId) {
    return Object.freeze((await this.accountRepository.list()).filter(account => account.portfolioId === portfolioId));
  }

  async importTransactions(portfolioId, inputs) {
    if (!Array.isArray(inputs) || inputs.length === 0) throw new TypeError('transactions doit être un tableau non vide.');
    const imported = [];
    const errors = [];
    for (let index = 0; index < inputs.length; index += 1) {
      try { imported.push(await this.facade.recordTransaction({ ...inputs[index], portfolioId })); }
      catch (error) { errors.push(Object.freeze({ index, code: error?.code ?? 'INVALID_TRANSACTION', message: error instanceof Error ? error.message : 'Transaction invalide.' })); }
    }
    return Object.freeze({ imported: Object.freeze(imported), errors: Object.freeze(errors), complete: errors.length === 0 });
  }
}

export class InMemoryEntityRepository {
  constructor() { this.items = new Map(); }
  async save(entity) { this.items.set(entity.id, entity); return entity; }
  async findById(id) { return this.items.get(id) ?? null; }
  async list() { return Object.freeze([...this.items.values()].sort((a, b) => a.id.localeCompare(b.id))); }
}
