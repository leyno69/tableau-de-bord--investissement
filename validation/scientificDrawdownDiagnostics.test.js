import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDependence, analyzeDrawdownEpisodes, analyzeVolatilityPersistence, describeDistribution } from './scientificDrawdownDiagnostics.js';

test('décrit la distribution sans supprimer les extrêmes', () => {
  const result = describeDistribution([-4, -1, 0, 1, 2, 8]);
  assert.equal(result.observationCount, 6);
  assert.equal(result.extremes.minimum, -4);
  assert.equal(result.extremes.maximum, 8);
  assert.ok(result.quantiles.p99 > result.quantiles.p95);
});

test('conserve les drawdowns récupérés et non récupérés', () => {
  const result = analyzeDrawdownEpisodes([100, 90, 80, 101, 95]);
  assert.equal(result.episodeCount, 2);
  assert.equal(result.recoveredCount, 1);
  assert.equal(result.unrecoveredCount, 1);
  assert.equal(result.maximumDepth, 0.2);
  assert.equal(result.episodes[0].recoveryDuration, 1);
});

test('sépare dépendance haussière, baissière et roulante', () => {
  const market = [-2, -1, 1, 2, -3, 3, -4, 4];
  const result = analyzeDependence(market, [-2, -1, -1, -2, -3, -3, -4, -4], market, 4);
  assert.ok(Number.isFinite(result.downMarket));
  assert.ok(Number.isFinite(result.upMarket));
  assert.equal(result.rolling.length, 5);
  assert.notEqual(result.downMarket, result.upMarket);
});

test('mesure autocorrélation des carrés et volatilité par régime', () => {
  const clustered = [...Array(30).fill(0).map((_, i) => (i % 2 ? -0.01 : 0.01)), ...Array(30).fill(0).map((_, i) => (i % 2 ? -0.10 : 0.10))];
  const result = analyzeVolatilityPersistence(clustered, 10);
  assert.ok(result.squaredReturnLag1Correlation > 0.8);
  assert.ok(result.regimes.high.volatility > result.regimes.low.volatility);
});
