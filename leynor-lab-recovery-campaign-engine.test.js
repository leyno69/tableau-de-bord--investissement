import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contributionForMonth,
  quantile,
  runRecoveryAfterInterruptionCampaign,
  simulateRecoveryPathSet
} from './leynor-lab-recovery-campaign-engine.js';

const assumptions = Object.freeze({
  initialCapital: 10000,
  monthlyContribution: 300,
  annualGeometricReturn: 0.05,
  annualVolatility: 0.15,
  interruptionStartMonth: 25,
  interruptionEndMonth: 36
});

const config = Object.freeze({
  campaignId: 'behavior-recovery-after-interruption-001',
  seeds: Object.freeze([104729, 130363]),
  horizons: Object.freeze([5]),
  scenarios: Object.freeze(['immediate', 'progressive-6', 'progressive-12', 'delayed-12', 'no-restart']),
  pathsPerReplication: 50,
  assumptions,
  limitations: Object.freeze(['Synthetic assumptions only.', 'No fees, taxes or inflation.'])
});

test('calcule les quantiles interpolés', () => {
  assert.equal(quantile([0, 10], 0.25), 2.5);
  assert.equal(quantile([4, 1, 3, 2], 0.5), 2.5);
});

test('applique exactement les calendriers de reprise', () => {
  assert.equal(contributionForMonth('immediate', 37, assumptions), 300);
  assert.equal(contributionForMonth('progressive-6', 37, assumptions), 50);
  assert.equal(contributionForMonth('progressive-6', 42, assumptions), 300);
  assert.equal(contributionForMonth('progressive-12', 42, assumptions), 150);
  assert.equal(contributionForMonth('delayed-12', 48, assumptions), 0);
  assert.equal(contributionForMonth('delayed-12', 49, assumptions), 300);
  assert.equal(contributionForMonth('no-restart', 120, assumptions), 0);
  assert.equal(contributionForMonth('immediate', 30, assumptions), 0);
});

test('reproduit exactement une réplication avec la même graine', () => {
  const input = { seed: 104729, paths: 100, years: 5, scenario: 'progressive-6', assumptions };
  assert.deepEqual(simulateRecoveryPathSet(input), simulateRecoveryPathSet(input));
});

test('produit cinq scénarios, plusieurs graines et des métriques complètes', () => {
  const result = runRecoveryAfterInterruptionCampaign(config);
  assert.equal(result.totalPaths, 500);
  assert.equal(result.replications.length, 10);
  assert.equal(result.summary.length, 5);
  assert.equal(result.model.notice, 'Scenario comparison, not a forecast.');
  for (const row of result.replications) {
    assert.ok(row.finalP05 <= row.finalP10);
    assert.ok(row.finalP10 <= row.finalMedian);
    assert.ok(row.finalMedian <= row.finalP90);
    assert.ok(row.finalP90 <= row.finalP95);
    assert.ok(row.drawdownMedian >= 0 && row.drawdownMedian <= 1);
    assert.ok(row.probabilityAboveContributions >= 0 && row.probabilityAboveContributions <= 1);
    assert.ok(row.recoveryRate >= 0 && row.recoveryRate <= 1);
  }
});

test('refuse une campagne à graine unique', () => {
  assert.throws(
    () => runRecoveryAfterInterruptionCampaign({ ...config, seeds: [1] }),
    /au moins deux graines/
  );
});
