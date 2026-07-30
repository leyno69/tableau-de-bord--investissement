import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { CashLedger } from '../../domain/cash/CashLedger.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';

/**
 * Point d'entrée applicatif stable destiné aux interfaces HTTP, CLI ou UI.
 *
 * La façade traduit des intentions simples en cas d'usage sans exposer les
 * dépôts, les ledgers ni l'ordre d'orchestration au consommateur.
 */
export class PortfolioApplicationFacade {
  constructor({
    addTransaction,
    buildDashboard,
    persistDashboardState,
    transactionRepository,
    snapshotRepository,
    alertRepository,
    preferencesRepository,
    portfolioLedger = PortfolioLedger,
    cashLedger = CashLedger
  }) {
    PortfolioApplicationFacade.#useCase(addTransaction, 'addTransaction');
    PortfolioApplicationFacade.#useCase(buildDashboard, 'buildDashboard');
    PortfolioApplicationFacade.#useCase(persistDashboardState, 'persistDashboardState');
    PortfolioApplicationFacade.#repository(transactionRepository, ['listByPortfolio'], 'transactionRepository');
    PortfolioApplicationFacade.#repository(snapshotRepository, ['listByPortfolio'], 'snapshotRepository');
    PortfolioApplicationFacade.#repository(alertRepository, ['listByPortfolio', 'listFingerprints'], 'alertRepository');
    PortfolioApplicationFacade.#repository(preferencesRepository, ['save', 'findByPortfolio'], 'preferencesRepository');

    if (!portfolioLedger || typeof portfolioLedger.rebuildPositions !== 'function') {
      throw new TypeError('portfolioLedger doit implémenter rebuildPositions().');
    }
    if (!cashLedger || typeof cashLedger.rebuildMoneyBalances !== 'function') {
      throw new TypeError('cashLedger doit implémenter rebuildMoneyBalances().');
    }

    this.addTransaction = addTransaction;
    this.buildDashboard = buildDashboard;
    this.persistDashboardState = persistDashboardState;
    this.transactionRepository = transactionRepository;
    this.snapshotRepository = snapshotRepository;
    this.alertRepository = alertRepository;
    this.preferencesRepository = preferencesRepository;
    this.portfolioLedger = portfolioLedger;
    this.cashLedger = cashLedger;
  }

  async recordTransaction(properties) {
    return this.addTransaction.execute(properties);
  }

  async savePreferences(properties) {
    const preferences = properties instanceof PortfolioPreferences
      ? properties
      : new PortfolioPreferences(properties);

    return this.preferencesRepository.save(preferences);
  }

  async loadPortfolio(portfolioId) {
    const normalizedPortfolioId = PortfolioApplicationFacade.#text(portfolioId, 'portfolioId');
    const [transactions, historicalSnapshots, alerts, existingFingerprints, preferences] = await Promise.all([
      this.transactionRepository.listByPortfolio(normalizedPortfolioId),
      this.snapshotRepository.listByPortfolio(normalizedPortfolioId),
      this.alertRepository.listByPortfolio(normalizedPortfolioId),
      this.alertRepository.listFingerprints(normalizedPortfolioId),
      this.preferencesRepository.findByPortfolio(normalizedPortfolioId)
    ]);

    const positions = this.portfolioLedger.rebuildPositions(transactions);
    const cashBalances = this.cashLedger.rebuildMoneyBalances(transactions);

    return Object.freeze({
      portfolioId: normalizedPortfolioId,
      preferences,
      transactions: Object.freeze([...transactions]),
      positions: Object.freeze([...positions]),
      cashBalances: Object.freeze([...cashBalances]),
      historicalSnapshots: Object.freeze([...historicalSnapshots]),
      alerts: Object.freeze([...alerts]),
      existingFingerprints: Object.freeze([...existingFingerprints])
    });
  }

  async generateDashboard({ portfolioId, marketQuotes = [] }) {
    if (!Array.isArray(marketQuotes)) {
      throw new TypeError('marketQuotes doit être un tableau.');
    }

    const state = await this.loadPortfolio(portfolioId);
    if (!(state.preferences instanceof PortfolioPreferences)) {
      throw new Error(`Aucune préférence n'est configurée pour le portefeuille "${state.portfolioId}".`);
    }

    const dashboard = await this.buildDashboard.execute({
      portfolioId: state.portfolioId,
      positions: state.positions,
      cashBalances: state.cashBalances,
      baseCurrency: state.preferences.baseCurrency,
      historicalSnapshots: state.historicalSnapshots,
      marketQuotes,
      existingFingerprints: state.existingFingerprints,
      periodsPerYear: state.preferences.periodsPerYear
    });

    await this.persistDashboardState.execute(dashboard);
    return dashboard;
  }

  static #useCase(value, field) {
    if (!value || typeof value.execute !== 'function') {
      throw new TypeError(`${field} doit implémenter execute().`);
    }
  }

  static #repository(value, methods, field) {
    if (!value) throw new TypeError(`${field} est obligatoire.`);
    for (const method of methods) {
      if (typeof value[method] !== 'function') {
        throw new TypeError(`${field} doit implémenter ${method}().`);
      }
    }
  }

  static #text(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${field} doit être une chaîne non vide.`);
    }
    return value.trim();
  }
}
