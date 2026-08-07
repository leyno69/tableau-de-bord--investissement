import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDrawdownAgainstSimulation, describeReturnTailRisk, pearsonCorrelation } from './historicalRiskDiagnostics.js';

test('corrélation de Pearson détecte une relation linéaire parfaite', () => {
  assert.equal(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]), 1);
});

test('diagnostic de queue conserve asymétrie et extrêmes', () => {
  const result = describeReturnTailRisk([0.01, 0.015, -0.012, 0.008, -0.09, 0.02], {
    referenceMonthlyMean: 0.003,
    referenceMonthlyVolatility: 0.02
  });
  assert.equal(result.observationCount, 6);
  assert.equal(result.negativeBeyond2SigmaCount, 1);
  assert.equal(result.beyond3SigmaCount, 1);
  assert.ok(result.skewness < 0);
});

test('drawdown au-delà du p95 est conservé comme preuve adverse', () => {
  const result = classifyDrawdownAgainstSimulation(0.2168, { median: 0.0674, p95: 0.1582, maximum: 0.2798 });
  assert.equal(result.band, 'p95-maximum');
  assert.equal(result.adverseEvidence, true);
});

test('drawdown inférieur à la médiane ne produit pas de preuve adverse', () => {
  const result = classifyDrawdownAgainstSimulation(0.04, { median: 0.0674, p95: 0.1582, maximum: 0.2798 });
  assert.equal(result.band, 'at-or-below-median');
  assert.equal(result.adverseEvidence, false);
});
