import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailyGaussianDrawdownExperiment } from './dailyGaussianDrawdownExperiment.js';

test('est reproductible à graine identique', () => {
  const a = runDailyGaussianDrawdownExperiment({ pathCount: 500, tradingDays: 63, seed: 123 });
  const b = runDailyGaussianDrawdownExperiment({ pathCount: 500, tradingDays: 63, seed: 123 });
  assert.deepEqual(a.drawdown, b.drawdown);
});

test('le p95 est supérieur ou égal à la médiane', () => {
  const result = runDailyGaussianDrawdownExperiment({ pathCount: 1000, tradingDays: 63 });
  assert.ok(result.drawdown.p95 >= result.drawdown.median);
  assert.ok(result.drawdown.p99 >= result.drawdown.p95);
  assert.ok(result.drawdown.maximum >= result.drawdown.p99);
});

test('une volatilité nulle produit un drawdown nul avec rendement positif', () => {
  const result = runDailyGaussianDrawdownExperiment({ pathCount: 20, tradingDays: 20, annualReturn: 0.05, annualVolatility: 0 });
  assert.equal(result.drawdown.maximum, 0);
});
