import { AddTransaction } from '../use-cases/AddTransaction.js';
import { ValuePortfolio } from '../use-cases/ValuePortfolio.js';
import { CalculatePortfolioPerformance } from '../use-cases/CalculatePortfolioPerformance.js';
import { CalculatePortfolioAllocation } from '../use-cases/CalculatePortfolioAllocation.js';
import { AnalyzePortfolioSeries } from '../use-cases/AnalyzePortfolioSeries.js';
import { EvaluatePortfolioAlerts } from '../use-cases/EvaluatePortfolioAlerts.js';
import { BuildPortfolioDashboard } from '../use-cases/BuildPortfolioDashboard.js';
import { PersistDashboardState } from '../use-cases/PersistDashboardState.js';
import { PortfolioApplicationFacade } from '../facades/PortfolioApplicationFacade.js';
import {
  InMemoryTransactionRepository,
  InMemoryPortfolioSnapshotRepository,
  InMemoryAlertEventRepository,
  InMemoryPortfolioPreferencesRepository
} from '../../infrastructure/persistence/InMemoryRepositories.js';

export function createPortfolioApplication({
  marketPriceProvider,
  exchangeRateProvider,
  assetClassificationProvider,
  alertRules = [],
  repositories = {},
  clock = () => new Date(),
  idGenerator
} = {}) {
  requireMethod(marketPriceProvider, 'getPrice', 'marketPriceProvider');
  requireMethod(exchangeRateProvider, 'getRate', 'exchangeRateProvider');
  requireMethod(assetClassificationProvider, 'getClassification', 'assetClassificationProvider');
  if (!Array.isArray(alertRules)) throw new TypeError('alertRules doit être un tableau.');
  if (!repositories || typeof repositories !== 'object' || Array.isArray(repositories)) throw new TypeError('repositories doit être un objet.');
  if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
  if (idGenerator != null && typeof idGenerator !== 'function') throw new TypeError('idGenerator doit être une fonction.');

  const resolvedRepositories = Object.freeze({
    transactions: repositories.transactions ?? new InMemoryTransactionRepository(),
    snapshots: repositories.snapshots ?? new InMemoryPortfolioSnapshotRepository(),
    alerts: repositories.alerts ?? new InMemoryAlertEventRepository(),
    preferences: repositories.preferences ?? new InMemoryPortfolioPreferencesRepository()
  });

  const valuePortfolio = new ValuePortfolio({ marketPriceProvider, exchangeRateProvider });
  const calculatePerformance = new CalculatePortfolioPerformance({ exchangeRateProvider });
  const calculateAllocation = new CalculatePortfolioAllocation({ assetClassificationProvider });
  const analyzeSeries = new AnalyzePortfolioSeries();
  const evaluateAlerts = new EvaluatePortfolioAlerts({ rules: alertRules, clock, ...(idGenerator == null ? {} : { idGenerator }) });
  const addTransaction = new AddTransaction({ transactionRepository: resolvedRepositories.transactions });
  const buildDashboard = new BuildPortfolioDashboard({ valuePortfolio, calculatePerformance, calculateAllocation, analyzeSeries, evaluateAlerts, clock });
  const persistDashboardState = new PersistDashboardState({
    snapshotRepository: resolvedRepositories.snapshots,
    alertEventRepository: resolvedRepositories.alerts
  });

  const facade = new PortfolioApplicationFacade({
    addTransaction,
    buildDashboard,
    persistDashboardState,
    transactionRepository: resolvedRepositories.transactions,
    snapshotRepository: resolvedRepositories.snapshots,
    alertRepository: resolvedRepositories.alerts,
    preferencesRepository: resolvedRepositories.preferences
  });

  return Object.freeze({
    facade,
    repositories: resolvedRepositories,
    useCases: Object.freeze({ addTransaction, valuePortfolio, calculatePerformance, calculateAllocation, analyzeSeries, evaluateAlerts, buildDashboard, persistDashboardState })
  });
}

function requireMethod(value, method, field) {
  if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`);
}
