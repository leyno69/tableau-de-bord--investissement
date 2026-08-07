import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { CashLedger } from '../../domain/cash/CashLedger.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';

export class PortfolioApplicationFacade {
  constructor({ addTransaction, buildDashboard, persistDashboardState, loadMarketQuotes = null, valuationService = null, periodPerformanceService = null, dividendAnalyticsService = null, investmentProjectionService = null, goalTrackingService = null, chartSeriesService = null, transactionRepository, snapshotRepository, alertRepository, preferencesRepository, portfolioLedger = PortfolioLedger, cashLedger = CashLedger }) {
    PortfolioApplicationFacade.#useCase(addTransaction, 'addTransaction');
    PortfolioApplicationFacade.#useCase(buildDashboard, 'buildDashboard');
    PortfolioApplicationFacade.#useCase(persistDashboardState, 'persistDashboardState');
    if (loadMarketQuotes != null) PortfolioApplicationFacade.#useCase(loadMarketQuotes, 'loadMarketQuotes');
    PortfolioApplicationFacade.#optionalService(valuationService, ['valueAt', 'history'], 'valuationService');
    PortfolioApplicationFacade.#optionalService(periodPerformanceService, ['calculate'], 'periodPerformanceService');
    PortfolioApplicationFacade.#optionalService(dividendAnalyticsService, ['analyze'], 'dividendAnalyticsService');
    PortfolioApplicationFacade.#optionalService(investmentProjectionService, ['simulate'], 'investmentProjectionService');
    PortfolioApplicationFacade.#optionalService(goalTrackingService, ['evaluate'], 'goalTrackingService');
    PortfolioApplicationFacade.#optionalService(chartSeriesService, ['build'], 'chartSeriesService');
    PortfolioApplicationFacade.#repository(transactionRepository, ['listByPortfolio'], 'transactionRepository');
    PortfolioApplicationFacade.#repository(snapshotRepository, ['listByPortfolio'], 'snapshotRepository');
    PortfolioApplicationFacade.#repository(alertRepository, ['listByPortfolio', 'listFingerprints'], 'alertRepository');
    PortfolioApplicationFacade.#repository(preferencesRepository, ['save', 'findByPortfolio'], 'preferencesRepository');
    if (!portfolioLedger || typeof portfolioLedger.rebuildPositions !== 'function') throw new TypeError('portfolioLedger doit implémenter rebuildPositions().');
    if (!cashLedger || typeof cashLedger.rebuildMoneyBalances !== 'function') throw new TypeError('cashLedger doit implémenter rebuildMoneyBalances().');
    Object.assign(this, { addTransaction, buildDashboard, persistDashboardState, loadMarketQuotes, valuationService, periodPerformanceService, dividendAnalyticsService, investmentProjectionService, goalTrackingService, chartSeriesService, transactionRepository, snapshotRepository, alertRepository, preferencesRepository, portfolioLedger, cashLedger });
  }

  async recordTransaction(properties) { return this.addTransaction.execute(properties); }
  async savePreferences(properties) {
    const preferences = properties instanceof PortfolioPreferences ? properties : new PortfolioPreferences(properties);
    return this.preferencesRepository.save(preferences);
  }
  async valuePortfolioAt(input) { return this.#required(this.valuationService, 'valueAt', 'valorisation historique', input); }
  async loadValuationHistory(input) { return this.#required(this.valuationService, 'history', 'valorisation historique', input); }
  async calculatePeriodPerformance(input) { return this.#required(this.periodPerformanceService, 'calculate', 'performance calendaire', input); }
  async analyzeDividends(input) { return this.#required(this.dividendAnalyticsService, 'analyze', 'analyse des dividendes', input); }
  async simulateInvestment(input) { return this.#required(this.investmentProjectionService, 'simulate', 'simulation', input); }
  async evaluateGoal(input) { return this.#required(this.goalTrackingService, 'evaluate', 'suivi d’objectif', input); }
  async buildChartSeries(input) {
    if (this.valuationService == null || this.chartSeriesService == null) throw new Error("Le moteur de séries graphiques n'est pas configuré.");
    const valuations = await this.valuationService.history(input);
    return this.chartSeriesService.build({ valuations });
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
    return Object.freeze({ portfolioId: normalizedPortfolioId, preferences, transactions: Object.freeze([...transactions]), positions: Object.freeze([...positions]), cashBalances: Object.freeze([...cashBalances]), historicalSnapshots: Object.freeze([...historicalSnapshots]), alerts: Object.freeze([...alerts]), existingFingerprints: Object.freeze([...existingFingerprints]) });
  }

  async generateDashboard({ portfolioId, marketQuotes, marketDataPolicy = 'partial' } = {}) {
    if (marketQuotes != null && !Array.isArray(marketQuotes)) throw new TypeError('marketQuotes doit être un tableau.');
    if (!['strict', 'partial'].includes(marketDataPolicy)) throw new RangeError('marketDataPolicy doit valoir "strict" ou "partial".');
    const state = await this.loadPortfolio(portfolioId);
    if (!(state.preferences instanceof PortfolioPreferences)) throw new Error(`Aucune préférence n'est configurée pour le portefeuille "${state.portfolioId}".`);
    const loaded = marketQuotes == null
      ? await this.#loadQuotes(state.positions, marketDataPolicy)
      : Object.freeze({ quotes: Object.freeze([...marketQuotes]), issues: Object.freeze([]) });
    const dashboard = await this.buildDashboard.execute({
      portfolioId: state.portfolioId,
      positions: state.positions,
      cashBalances: state.cashBalances,
      baseCurrency: state.preferences.baseCurrency,
      historicalSnapshots: state.historicalSnapshots,
      marketQuotes: loaded.quotes,
      marketDataIssues: loaded.issues,
      marketDataPolicy,
      existingFingerprints: state.existingFingerprints,
      periodsPerYear: state.preferences.periodsPerYear
    });
    await this.persistDashboardState.execute(dashboard);
    return dashboard;
  }

  async #required(service, method, label, input) {
    if (service == null) throw new Error(`Le moteur de ${label} n'est pas configuré.`);
    return service[method](input);
  }
  async #loadQuotes(positions, policy) {
    if (this.loadMarketQuotes == null) return Object.freeze({ quotes: Object.freeze([]), issues: Object.freeze([]) });
    if (typeof this.loadMarketQuotes.executeDetailed === 'function') return this.loadMarketQuotes.executeDetailed({ positions, policy });
    return Object.freeze({ quotes: await this.loadMarketQuotes.execute({ positions, policy }), issues: Object.freeze([]) });
  }

  static #optionalService(value, methods, field) { if (value == null) return; for (const method of methods) if (typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
  static #useCase(value, field) { if (!value || typeof value.execute !== 'function') throw new TypeError(`${field} doit implémenter execute().`); }
  static #repository(value, methods, field) { if (!value) throw new TypeError(`${field} est obligatoire.`); for (const method of methods) if (typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
  static #text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
}
