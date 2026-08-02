import test from 'node:test';
import assert from 'node:assert/strict';
import {
  portfolioVolatility,
  quantile,
  simulateDiversificationPathSet,
  runDiversificationCampaign
} from './leynor-lab-diversification-campaign-engine.js';

const assumptions = Object.freeze({
  initialCapital: 10000,
  monthlyContribution: 300,
  annualGeometricReturn: 0.05,
  assetVolatility: 0.25
});

test('quantile interpole correctement', () => {
  assert.equal(quantile([0, 10], 0.25), 2.5);
});

test('la volatilité diminue lorsque le nombre de lignes augmente à corrélation constante', () => {
  const two = portfolioVolatility({ assetVolatility: 0.25, holdings: 2, averageCorrelation: 0.25 });
  const twenty = portfolioVolatility({ assetVolatility: 0.25, holdings: 20, averageCorrelation: 0.25 });
  assert.ok(twenty < two);
});

test('une forte corrélation sectorielle peut annuler le bénéfice du nombre de lignes', () => {
  const broadEight = portfolioVolatility({ assetVolatility: 0.25, holdings: 8, averageCorrelation: 0.25 });
  const sectorEight = portfolioVolatility({ assetVolatility: 0.25, holdings: 8, averageCorrelation: 0.65 });
  assert.ok(sectorEight > broadEight);
});

test('une graine fixe reproduit exactement les métriques', () => {
  const scenario = { id: 'eight-stocks', holdings: 8, averageCorrelation: 0.25 };
  const input = { seed: 104729, paths: 100, years: 5, scenario, assumptions };
  assert.deepEqual(simulateDiversificationPathSet(input), simulateDiversificationPathSet(input));
});

test('la campagne conserve toutes les réplications et le nombre total de trajectoires', () => {
  const result = runDiversificationCampaign({
    campaignId: 'test',
    pathsPerReplication: 10,
    seeds: [11, 13],
    horizons: [5, 10],
    scenarios: [
      { id: 'two', holdings: 2, averageCorrelation: 0.35 },
      { id: 'twenty', holdings: 20, averageCorrelation: 0.25 }
    ],
    assumptions,
    limitations: ['synthetic']
  });
  assert.equal(result.replications.length, 8);
  assert.equal(result.totalPaths, 80);
  assert.equal(result.notice, 'Scenario comparison, not a forecast.');
});
