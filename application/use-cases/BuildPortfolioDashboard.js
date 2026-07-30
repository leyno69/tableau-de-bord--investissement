import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';

/**
 * Orchestre les moteurs du portefeuille pour produire une vue consolidée.
 *
 * Ce cas d'usage ne reconstruit pas la comptabilité et ne contacte aucun
 * fournisseur directement. Toutes les dépendances sont injectées.
 */
export class BuildPortfolioDashboard {
  constructor({
    valuePortfolio,
    calculatePerformance,
    calculateAllocation,
    analyzeSeries,
    evaluateAlerts,
    clock = () => new Date()
  }) {
    BuildPortfolioDashboard.#requireUseCase(valuePortfolio, 'valuePortfolio');
    BuildPortfolioDashboard.#requireUseCase(calculatePerformance, 'calculatePerformance');
    BuildPortfolioDashboard.#requireUseCase(calculateAllocation, 'calculateAllocation');
    BuildPortfolioDashboard.#requireUseCase(analyzeSeries, 'analyzeSeries');
    BuildPortfolioDashboard.#requireUseCase(evaluateAlerts, 'evaluateAlerts');
    if (typeof clock !== 'function') {
      throw new TypeError('clock doit être une fonction.');
    }

    this.valuePortfolio = valuePortfolio;
    this.calculatePerformance = calculatePerformance;
    this.calculateAllocation = calculateAllocation;
    this.analyzeSeries = analyzeSeries;
    this.evaluateAlerts = evaluateAlerts;
    this.clock = clock;
  }

  async execute({
    portfolioId,
    positions,
    cashBalances,
    baseCurrency,
    historicalSnapshots = [],
    marketQuotes = [],
    existingFingerprints = [],
    periodsPerYear = null
  }) {
    const normalizedPortfolioId = BuildPortfolioDashboard.#requireText(portfolioId, 'portfolioId');
    BuildPortfolioDashboard.#requireArray(historicalSnapshots, 'historicalSnapshots');
    BuildPortfolioDashboard.#requireArray(marketQuotes, 'marketQuotes');
    BuildPortfolioDashboard.#requireArray(existingFingerprints, 'existingFingerprints');

    const generatedAt = BuildPortfolioDashboard.#requireDate(this.clock());
    const valuation = await this.valuePortfolio.execute({ positions, cashBalances, baseCurrency });

    const [performance, allocation] = await Promise.all([
      this.calculatePerformance.execute(valuation),
      this.calculateAllocation.execute(valuation)
    ]);

    const currentSnapshot = new PortfolioSnapshot({
      portfolioId: normalizedPortfolioId,
      totalValue: valuation.totalValue,
      capturedAt: generatedAt,
      source: 'DASHBOARD'
    });

    const analytics = this.analyzeSeries.execute({
      snapshots: [...historicalSnapshots, currentSnapshot],
      periodsPerYear
    });

    const alertContext = Object.freeze({
      valuation,
      performance,
      allocation,
      analytics,
      marketQuotes: Object.freeze([...marketQuotes])
    });

    const alerts = await this.evaluateAlerts.execute({
      portfolioId: normalizedPortfolioId,
      context: alertContext,
      existingFingerprints
    });

    return Object.freeze({
      portfolioId: normalizedPortfolioId,
      generatedAt,
      baseCurrency: valuation.baseCurrency,
      valuation,
      performance,
      allocation,
      analytics,
      alerts,
      currentSnapshot
    });
  }

  static #requireUseCase(value, field) {
    if (!value || typeof value.execute !== 'function') {
      throw new TypeError(`${field} doit implémenter execute().`);
    }
  }

  static #requireArray(value, field) {
    if (!Array.isArray(value)) {
      throw new TypeError(`${field} doit être un tableau.`);
    }
  }

  static #requireText(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${field} doit être une chaîne non vide.`);
    }
    return value.trim();
  }

  static #requireDate(value) {
    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      throw new TypeError('clock doit retourner une date valide.');
    }
    return new Date(timestamp).toISOString();
  }
}
