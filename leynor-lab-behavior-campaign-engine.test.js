import test from 'node:test';
import assert from 'node:assert/strict';
import { quantile, runContributionInterruptionCampaign } from './leynor-lab-behavior-campaign-engine.js';

const config = {
  campaignId: 'behavior-contribution-interruption-pilot-001',
  scenarios: ['regular', 'interruption'],
  horizons: [5, 10, 20, 30],
  seeds: [104729, 130363, 155921, 181081, 206369],
  pathsPerReplication: 500,
  assumptions: {
    annualGeometricReturn: 0.05,
    annualVolatility: 0.15,
    initialCapital: 10000,
    monthlyContribution: 300,
    interruptionStartMonth: 25,
    interruptionEndMonth: 36
  },
  limitations: [
    'Synthetic return model; no historical regime calibration.',
    'Independent monthly returns; no autocorrelation or fat tails.',
    'Taxes, fees and inflation excluded.',
    'The interruption window is fixed and does not model income shocks.',
    'Results must not feed the IGL without independent validation.'
  ]
};

test('interpole correctement les quantiles', () => {
  assert.equal(quantile([0, 10], 0.5), 5);
  assert.equal(quantile([0, 10, 20], 0.9), 18);
});

test('reproduit exactement la campagne pilote de 20 000 trajectoires', () => {
  const first = runContributionInterruptionCampaign(config);
  const second = runContributionInterruptionCampaign(config);
  assert.deepEqual(first, second);
  assert.equal(first.totalPaths, 20000);
  assert.equal(first.replications.length, 40);
  const regular30 = first.summary.find((row) => row.scenario === 'regular' && row.years === 30);
  const interruption30 = first.summary.find((row) => row.scenario === 'interruption' && row.years === 30);
  assert.ok(Math.abs(regular30.metrics.finalMedian.median - 245601.56491282) < 1e-6);
  assert.ok(Math.abs(interruption30.metrics.finalMedian.median - 232649.93182835) < 1e-6);
  assert.ok(regular30.metrics.finalMedian.median > interruption30.metrics.finalMedian.median);
});
