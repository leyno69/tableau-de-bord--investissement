import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioVolatility, simulateLineCountPathSet, runLineCountCampaign } from './leynor-lab-line-count-campaign-engine.js';

const assumptions = Object.freeze({
  initialCapital: 10000,
  monthlyContribution: 300,
  annualGeometricReturn: 0.05,
  assetVolatility: 0.22,
  correlation: 0.25
});

test('la volatilité diminue avec le nombre de lignes à corrélation constante', () => {
  assert.ok(portfolioVolatility({ lineCount: 20, assetVolatility: 0.22, correlation: 0.25 })
    < portfolioVolatility({ lineCount: 2, assetVolatility: 0.22, correlation: 0.25 }));
});

test('une réplication est strictement reproductible', () => {
  const input = { seed: 104729, paths: 50, years: 10, lineCount: 8, assumptions };
  assert.deepEqual(simulateLineCountPathSet(input), simulateLineCountPathSet(input));
});

test('la campagne conserve tous les croisements', () => {
  const result = runLineCountCampaign({
    campaignId: 'portfolio-line-count-test',
    lineCounts: [2, 5, 20],
    horizons: [5, 30],
    seeds: [11, 13],
    pathsPerReplication: 10,
    assumptions,
    limitations: ['synthetic']
  });
  assert.equal(result.replications.length, 12);
  assert.equal(result.totalPaths, 120);
  assert.equal(result.notice, 'Scenario comparison, not a forecast.');
});

test('les entrées invalides sont rejetées', () => {
  assert.throws(() => portfolioVolatility({ lineCount: 1, assetVolatility: 0.22, correlation: 0.25 }), RangeError);
  assert.throws(() => portfolioVolatility({ lineCount: 5, assetVolatility: 0.22, correlation: 2 }), RangeError);
});
