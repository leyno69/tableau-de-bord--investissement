import { Account } from '../../domain/account/Account.js';
import { Portfolio } from '../../domain/portfolio/Portfolio.js';

/**
 * Construit une vue consolidée des comptes rattachés à un portefeuille.
 *
 * Cette vue ne calcule aucune valorisation : elle expose une structure fiable
 * que les futurs moteurs de positions, de change et de performance enrichiront.
 */
export class BuildPortfolioOverview {
  constructor({ portfolioRepository, accountRepository }) {
    BuildPortfolioOverview.#requireRepositoryMethod(
      portfolioRepository,
      'findById',
      'portfolioRepository'
    );
    BuildPortfolioOverview.#requireRepositoryMethod(
      accountRepository,
      'findByPortfolioId',
      'accountRepository'
    );

    this.portfolioRepository = portfolioRepository;
    this.accountRepository = accountRepository;
  }

  execute(portfolioId) {
    const normalizedPortfolioId = BuildPortfolioOverview.#requireIdentifier(
      portfolioId,
      'portfolioId'
    );
    const portfolio = this.portfolioRepository.findById(normalizedPortfolioId);

    if (portfolio == null) {
      throw new RangeError(`Le portefeuille "${normalizedPortfolioId}" est introuvable.`);
    }

    if (!(portfolio instanceof Portfolio)) {
      throw new TypeError('portfolioRepository.findById() doit retourner une instance de Portfolio ou null.');
    }

    const accounts = this.accountRepository.findByPortfolioId(normalizedPortfolioId);

    if (!Array.isArray(accounts)) {
      throw new TypeError('accountRepository.findByPortfolioId() doit retourner un tableau.');
    }

    for (const account of accounts) {
      if (!(account instanceof Account)) {
        throw new TypeError('Chaque compte doit être une instance de Account.');
      }

      if (account.portfolioId !== portfolio.id) {
        throw new RangeError(
          `Le compte "${account.id}" n'appartient pas au portefeuille "${portfolio.id}".`
        );
      }
    }

    const orderedAccounts = [...accounts].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const activeAccounts = orderedAccounts.filter(account => account.isActive);
    const closedAccounts = orderedAccounts.filter(account => account.isClosed);
    const securitiesAccounts = activeAccounts.filter(account => account.isSecuritiesAccount);
    const cashAccounts = activeAccounts.filter(account => account.isCashAccount);
    const providers = [...new Set(activeAccounts.map(account => account.providerId))].sort();
    const currencies = [...new Set(activeAccounts.map(account => account.currency))].sort();

    return Object.freeze({
      portfolio,
      accounts: Object.freeze(orderedAccounts),
      activeAccounts: Object.freeze(activeAccounts),
      closedAccounts: Object.freeze(closedAccounts),
      securitiesAccounts: Object.freeze(securitiesAccounts),
      cashAccounts: Object.freeze(cashAccounts),
      providers: Object.freeze(providers),
      currencies: Object.freeze(currencies),
      summary: Object.freeze({
        accountCount: orderedAccounts.length,
        activeAccountCount: activeAccounts.length,
        closedAccountCount: closedAccounts.length,
        securitiesAccountCount: securitiesAccounts.length,
        cashAccountCount: cashAccounts.length,
        providerCount: providers.length,
        currencyCount: currencies.length
      })
    });
  }

  static #requireRepositoryMethod(repository, methodName, repositoryName) {
    if (!repository) {
      throw new TypeError(`${repositoryName} est obligatoire.`);
    }

    if (typeof repository[methodName] !== 'function') {
      throw new TypeError(`${repositoryName} doit implémenter la méthode ${methodName}().`);
    }
  }

  static #requireIdentifier(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }

    return value.trim();
  }
}
