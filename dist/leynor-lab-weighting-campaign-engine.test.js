import test from 'node:test';
import assert from 'node:assert/strict';
import { quantile, validateScenario, simulateScenarioPathSet, runWeightingRebalancingCorrelationCampaign } from './leynor-lab-weighting-campaign-engine.js';

const assumptions = { initialCapital: 10000, monthlyContribution: 300, annualGeometricReturn: 0.05, annualAssetVolatility: 0.22 };
const equalWeights = Array(8).fill(1 / 8);
const baseScenario = { id: 'equal-quarterly-medium-correlation', assetCount: 8, targetWeights: equalWeights, correlation: 0.35, rebalanceEveryMonths: 3 };

test('quantile interpole correctement', () => {
  assert.equal(quantile([0, 10], 0.25), 2.5);
});

test('validateScenario rejette des poids incohérents', () => {
  assert.throws(() => validateScenario({ ...baseScenario, targetWeights: [0.5, 0.5] }), /incohérents/);
});

test('une graine fixe reproduit exactement le même résultat', () => {
  const input = { seed: 104729, paths: 100, years: 5, scenario: baseScenario, assumptions };
  assert.deepEqual(simulateScenarioPathSet(input), simulateScenarioPathSet(input));
});

test('le rééquilibrage limite la concentration finale', () => {
  const rebalanced = simulateScenarioPathSet({ seed: 130363, paths: 400, years: 20, scenario: baseScenario, assumptions });
  const drifting = simulateScenarioPathSet({ seed: 130363, paths: 400, years: 20, scenario: { ...baseScenario, id: 'drifting', rebalanceEveryMonths: 0 }, assumptions });
  assert.ok(rebalanced.endingLargestWeightMedian < drifting.endingLargestWeightMedian);
});

test('la campagne conserve toutes les réplications', () => {
  const result = runWeightingRebalancingCorrelationCampaign({
    campaignId: 'test', assumptions, scenarios: [baseScenario], horizons: [5, 10], seeds: [11, 22], pathsPerReplication: 10, limitations: ['synthetic']
  });
  assert.equal(result.totalPaths, 40);
  assert.equal(result.replications.length, 4);
  assert.equal(result.summary.length, 2);
});
