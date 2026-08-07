import test from 'node:test';
import assert from 'node:assert/strict';
import { computePortfolioVolatility, runFactorialPilot, simulateFactorialCell } from './leynor-lab-factorial-pilot-engine.js';

const assumptions = Object.freeze({
  initialCapital: 10000,
  monthlyContribution: 300,
  annualGeometricReturn: 0.05,
  correlation: 0.35
});

test('la volatilité baisse lorsque le nombre de lignes augmente à corrélation constante', () => {
  const two = computePortfolioVolatility({ lineCount: 2, assetVolatility: 0.2, correlation: 0.35 });
  const fifteen = computePortfolioVolatility({ lineCount: 15, assetVolatility: 0.2, correlation: 0.35 });
  assert.ok(fifteen < two);
});

test('une cellule est exactement reproductible avec la même graine', () => {
  const input = { seed: 12345, paths: 25, years: 5, behavior: 'interruption', reserveMonths: 6, lineCount: 15, assetVolatility: 0.2, assumptions };
  assert.deepEqual(simulateFactorialCell(input), simulateFactorialCell(input));
});

test('la réserve couvre une partie du choc d interruption dans le modèle', () => {
  const withoutReserve = simulateFactorialCell({ seed: 7, paths: 50, years: 5, behavior: 'interruption', reserveMonths: 0, lineCount: 5, assetVolatility: 0.12, assumptions });
  const withReserve = simulateFactorialCell({ seed: 7, paths: 50, years: 5, behavior: 'interruption', reserveMonths: 6, lineCount: 5, assetVolatility: 0.12, assumptions });
  assert.equal(withoutReserve.forcedWithdrawalMedian, 3600);
  assert.equal(withReserve.forcedWithdrawalMedian, 1800);
});

test('la campagne calcule toutes les cellules factorielles', () => {
  const result = runFactorialPilot({
    campaignId: 'factorial-pilot-001',
    behaviors: ['regular', 'interruption'],
    reserveMonths: [0, 6],
    lineCounts: [5, 15],
    assetVolatilities: [0.12, 0.2],
    horizons: [5, 10],
    seeds: [101, 202],
    pathsPerReplication: 10,
    assumptions,
    limitations: ['synthetic']
  });
  assert.equal(result.replications.length, 64);
  assert.equal(result.totalPaths, 640);
  assert.match(result.notice, /not a forecast/);
});
