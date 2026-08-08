import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationResultSnapshot } from './leynor-lab-simulation-result-snapshot.js';

test('fige les métriques d’une exécution complète', () => {
  const snapshot = createSimulationResultSnapshot({ snapshotId: 's1', campaignId: 'c1', executionId: 'e1', seedPlanId: 'p1', generatedAt: '2026-01-01', completedRuns: 10000, finalValueMean: 200000, returnMean: 0.06, volatilityMean: 0.14, maxDrawdownMean: -0.28, lossFrequency: 0.31, recoveryDurationMeanDays: 18, goalProbability: 0.67, percentiles: { p05: 80000, p50: 190000, p95: 410000 }, assumptions: ['rendements hypothétiques'], limitations: ['aucune prévision'] });
  assert.equal(snapshot.completedRuns, 10000);
  assert.equal(snapshot.percentiles.p50, 190000);
});

test('refuse un instantané sans percentiles', () => {
  assert.throws(() => createSimulationResultSnapshot({ snapshotId: 's', campaignId: 'c', executionId: 'e', seedPlanId: 'p', generatedAt: 't', completedRuns: 1, finalValueMean: 1, returnMean: 0, volatilityMean: 0, maxDrawdownMean: 0, lossFrequency: 0, recoveryDurationMeanDays: 0, goalProbability: 0, percentiles: {} }));
});
