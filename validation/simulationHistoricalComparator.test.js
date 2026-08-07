import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSimulationToHistorical } from './simulationHistoricalComparator.js';

function snapshot(overrides = {}) {
  return {
    snapshotId: 'snapshot-001', campaignId: 'campaign-001',
    returnMean: 0.08, volatilityMean: 0.12, maxDrawdownMean: -0.18,
    recoveryDurationMean: 90,
    ...overrides
  };
}

function historical(overrides = {}) {
  return {
    startDate: '2020-01-02', endDate: '2021-01-04', durationDays: 368,
    cumulativeReturn: 0.10, annualizedVolatility: 0.15, maxDrawdown: -0.22,
    recovery: { recovered: true, recoveryDaysFromTrough: 120 },
    ...overrides
  };
}

test('compare les métriques sans fabriquer de verdict calibré', () => {
  const result = compareSimulationToHistorical({ snapshot: snapshot(), historicalMetrics: historical() });
  assert.equal(result.comparisons.length, 3);
  assert.equal(result.comparisons[0].metric, 'return');
  assert.ok(Math.abs(result.comparisons[0].delta - 0.02) < 1e-12);
  assert.equal(result.interpretation.classification, 'descriptive-only');
  assert.equal(result.interpretation.calibratedThresholdsApplied, false);
});

test('conserve explicitement une récupération historique non observée', () => {
  const result = compareSimulationToHistorical({ snapshot: snapshot(), historicalMetrics: historical({ recovery: { recovered: false, recoveryDaysFromTrough: null } }) });
  assert.equal(result.recovery.historicalRecovered, false);
  assert.equal(result.recovery.historicalRecoveryDays, null);
  assert.equal(result.recovery.deltaDays, null);
});

test('le drawdown conserve son signe et son écart descriptif', () => {
  const result = compareSimulationToHistorical({ snapshot: snapshot(), historicalMetrics: historical() });
  const drawdown = result.comparisons.find(item => item.metric === 'maxDrawdown');
  assert.equal(drawdown.simulated, -0.18);
  assert.equal(drawdown.historical, -0.22);
  assert.ok(Math.abs(drawdown.delta - (-0.04)) < 1e-12);
});

test('refuse une métrique historique non finie', () => {
  assert.throws(() => compareSimulationToHistorical({ snapshot: snapshot(), historicalMetrics: historical({ cumulativeReturn: NaN }) }), /nombre fini/);
});
