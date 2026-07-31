import test from 'node:test';
import assert from 'node:assert/strict';

import { Transaction } from '../../domain/transaction/Transaction.js';
import { DividendAnalyticsService } from '../../application/services/DividendAnalyticsService.js';
import { InvestmentProjectionService } from '../../application/services/InvestmentProjectionService.js';
import { GoalTrackingService } from '../../application/services/GoalTrackingService.js';
import { PortfolioChartSeriesService } from '../../application/services/PortfolioChartSeriesService.js';

const dividend = properties => new Transaction({
  id: properties.id,
  portfolioId: 'p-1',
  accountId: properties.accountId ?? 'a-1',
  assetId: properties.assetId ?? 'WORLD',
  type: 'dividend',
  quantity: 0,
  unitPrice: 0,
  amount: properties.amount,
  fees: properties.fees ?? 0,
  taxes: properties.taxes ?? 0,
  currency: properties.currency ?? 'EUR',
  executedAt: properties.executedAt,
  createdAt: `${properties.executedAt}T12:00:00.000Z`
});

test('agrège les dividendes nets par actif, compte et mois', async () => {
  const service = new DividendAnalyticsService({
    transactionRepository: { async listByPortfolio() { return [
      dividend({ id: 'd1', amount: 10, taxes: 2, executedAt: '2026-01-10' }),
      dividend({ id: 'd2', amount: 20, fees: 1, assetId: 'EM', accountId: 'a-2', currency: 'USD', executedAt: '2026-01-20' })
    ]; } },
    exchangeRateProvider: { async getRate(from, to) { assert.equal(from, 'USD'); assert.equal(to, 'EUR'); return 0.9; } }
  });
  const result = await service.analyze({ portfolioId: 'p-1', from: '2026-01-01', to: '2026-01-31' });
  assert.equal(result.count, 2);
  assert.equal(result.totalNet, 25.1);
  assert.deepEqual(result.byMonth, [{ id: '2026-01', net: 25.1 }]);
});

test('simule les versements et intérêts composés de façon déterministe', () => {
  const result = new InvestmentProjectionService().simulate({ initialCapital: 1000, monthlyContribution: 100, annualReturnRate: 0.06, years: 2, targetAmount: 3500 });
  assert.equal(result.yearly.length, 2);
  assert.equal(result.totalContributed, 3400);
  assert.equal(result.finalBalance > result.totalContributed, true);
  assert.equal(result.targetReached, true);
});

test('évalue un objectif et calcule le versement mensuel requis', () => {
  const result = new GoalTrackingService().evaluate({ currentAmount: 10000, targetAmount: 20000, asOfDate: '2026-01-01', targetDate: '2028-01-01', monthlyContribution: 300, annualReturnRate: 0.05 });
  assert.equal(result.monthsRemaining, 24);
  assert.equal(result.progressRate, 0.5);
  assert.equal(result.requiredMonthlyContribution > 0, true);
  assert.equal(typeof result.onTrack, 'boolean');
});

test('construit des séries graphiques triées et un drawdown', () => {
  const result = new PortfolioChartSeriesService().build({ valuations: [
    { date: '2026-01-03', totalValue: { amount: 90, currency: 'EUR' }, positionsValue: { amount: 80 }, cashValue: { amount: 10 } },
    { date: '2026-01-01', totalValue: { amount: 100, currency: 'EUR' }, positionsValue: { amount: 90 }, cashValue: { amount: 10 } },
    { date: '2026-01-02', totalValue: { amount: 120, currency: 'EUR' }, positionsValue: { amount: 100 }, cashValue: { amount: 20 } }
  ] });
  assert.deepEqual(result.labels, ['2026-01-01', '2026-01-02', '2026-01-03']);
  assert.deepEqual(result.series.drawdown.map(point => point.y), [0, 0, -0.25]);
  assert.equal(Object.isFrozen(result.series.value), true);
});

test('valide les entrées des moteurs de planification', async () => {
  assert.throws(() => new InvestmentProjectionService().simulate({ years: 0 }), /years/);
  assert.throws(() => new GoalTrackingService().evaluate({ currentAmount: 0, targetAmount: 0, asOfDate: '2026-01-01', targetDate: '2027-01-01' }), /strictement positif/);
  assert.throws(() => new PortfolioChartSeriesService().build({ valuations: [{}] }), /valorisation/);
});
