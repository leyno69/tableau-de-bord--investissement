import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOCKS, quantile, simulateResiliencePathSet, runFinancialResilienceCampaign } from './leynor-lab-financial-resilience-engine.js';

const assumptions = {
  initialCapital: 10000,
  monthlyContribution: 300,
  monthlyEssentialExpenses: 2000,
  annualGeometricReturn: 0.05,
  annualVolatility: 0.15,
  shockStartMonth: 25
};

test('calcule les quantiles interpolés', () => {
  assert.equal(quantile([0, 10], 0.25), 2.5);
});

test('expose quatre chocs documentés', () => {
  assert.deepEqual(Object.keys(SHOCKS), ['income-loss-3', 'income-loss-6', 'expense-6000', 'combined']);
});

test('reproduit exactement une simulation à graine fixe', () => {
  const input = { seed: 104729, paths: 100, years: 10, reserveMonths: 6, shockId: 'combined', assumptions };
  assert.deepEqual(simulateResiliencePathSet(input), simulateResiliencePathSet(input));
});

test('une réserve suffisante supprime le retrait forcé pour la dépense de 6000 euros', () => {
  const result = simulateResiliencePathSet({ seed: 104729, paths: 100, years: 5, reserveMonths: 3, shockId: 'expense-6000', assumptions });
  assert.equal(result.forcedWithdrawalProbability, 0);
});

test('une absence de réserve provoque un retrait forcé', () => {
  const result = simulateResiliencePathSet({ seed: 104729, paths: 100, years: 5, reserveMonths: 0, shockId: 'expense-6000', assumptions });
  assert.equal(result.forcedWithdrawalProbability, 1);
  assert.ok(result.forcedWithdrawalMedian > 0);
});

test('agrège toutes les combinaisons prévues', () => {
  const result = runFinancialResilienceCampaign({
    campaignId: 'test', seeds: [11, 13], horizons: [5], reserveMonths: [0, 3], shockIds: ['expense-6000'], pathsPerReplication: 10,
    assumptions, limitations: ['synthetic']
  });
  assert.equal(result.summary.length, 2);
  assert.equal(result.replications.length, 4);
  assert.equal(result.totalPaths, 40);
});
