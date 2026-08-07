import test from 'node:test';
import assert from 'node:assert/strict';
import { describeReturnDistribution, diagnoseJointMarketRisk, pearsonCorrelation } from './marketRiskDiagnostics.js';

test('pearsonCorrelation détecte une dépendance linéaire parfaite', () => {
  assert.equal(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]), 1);
});

test('describeReturnDistribution conserve les queues et la persistance', () => {
  const report = describeReturnDistribution([-0.08, -0.03, -0.01, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04]);
  assert.equal(report.observationCount, 10);
  assert.ok(Number.isFinite(report.skewness));
  assert.ok(Number.isFinite(report.excessKurtosis));
  assert.ok(Number.isFinite(report.downsideTailGapP01));
  assert.ok(report.squaredReturnLag1Correlation == null || Number.isFinite(report.squaredReturnLag1Correlation));
});

test('diagnoseJointMarketRisk mesure la corrélation et les baisses conjointes', () => {
  const result = diagnoseJointMarketRisk({
    worldReturns: [-0.03, -0.01, 0.02, 0.01, -0.02, 0.015],
    asiaReturns: [-0.04, -0.02, 0.01, 0.015, -0.01, 0.02]
  });
  assert.ok(result.contemporaneousCorrelation > 0);
  assert.equal(result.jointNegativeShare, 0.5);
  assert.equal(result.interpretation.statement.includes('calibration'), true);
});

test('refuse les séries de tailles différentes', () => {
  assert.throws(() => diagnoseJointMarketRisk({ worldReturns: [1, 2, 3], asiaReturns: [1, 2, 3, 4] }), /même longueur/);
});
