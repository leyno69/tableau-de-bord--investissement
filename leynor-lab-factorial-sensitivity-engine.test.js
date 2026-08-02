import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePortfolioVolatility,
  runFactorialSensitivity,
  simulateSensitivityCell,
  summarizeMainEffects
} from './leynor-lab-factorial-sensitivity-engine.js';

const assumptions = Object.freeze({
  initialCapital: 10000,
  monthlyContribution: 300,
  annualGeometricReturn: 0.05
});

test('la volatilité augmente avec la corrélation à nombre de lignes constant', () => {
  const low = computePortfolioVolatility({ lineCount: 15, assetVolatility: 0.2, correlation: 0.1 });
  const high = computePortfolioVolatility({ lineCount: 15, assetVolatility: 0.2, correlation: 0.75 });
  assert.ok(high > low);
});

test('une cellule est exactement reproductible', () => {
  const input = {
    seed: 1234, paths: 20, years: 10, behavior: 'interruption',
    reserveMonths: 6, lineCount: 15, assetVolatility: 0.2,
    correlation: 0.35, shockIntensity: 3600, assumptions
  };
  assert.deepEqual(simulateSensitivityCell(input), simulateSensitivityCell(input));
});

test('une réserve plus élevée réduit le retrait forcé dans un choc donné', () => {
  const common = {
    seed: 17, paths: 25, years: 5, behavior: 'regular',
    lineCount: 5, assetVolatility: 0.12, correlation: 0.35,
    shockIntensity: 3600, assumptions
  };
  const withoutReserve = simulateSensitivityCell({ ...common, reserveMonths: 0 });
  const withReserve = simulateSensitivityCell({ ...common, reserveMonths: 6 });
  assert.ok(withReserve.forcedWithdrawalMedian < withoutReserve.forcedWithdrawalMedian);
});

test('le plan factoriel couvre toutes les combinaisons', () => {
  const result = runFactorialSensitivity({
    campaignId: 'factorial-sensitivity-001',
    behaviors: ['regular', 'interruption'],
    reserveMonths: [0, 6],
    lineCounts: [5, 15],
    assetVolatilities: [0.12, 0.2],
    correlations: [0.1, 0.75],
    shockIntensities: [0, 3600],
    horizons: [10, 30],
    seeds: [101, 202],
    pathsPerReplication: 5,
    assumptions,
    limitations: ['synthetic']
  });
  assert.equal(result.replications.length, 256);
  assert.equal(result.totalPaths, 1280);
  assert.match(result.notice, /not a forecast/);
  assert.ok(summarizeMainEffects(result).length > 0);
});
