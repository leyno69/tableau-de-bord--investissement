import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTwoFactorInteraction,
  classifyRelativeDispersion,
  rankInteractionAnalyses,
  recommendAdditionalSeeds,
  summarizeCellStability,
} from './leynor-lab-factorial-interaction-analysis.js';

test('classe la stabilité avec des seuils explicites', () => {
  assert.equal(classifyRelativeDispersion(0.05), 'stable');
  assert.equal(classifyRelativeDispersion(0.10), 'watch');
  assert.equal(classifyRelativeDispersion(0.2233), 'unstable');
});

test('résume une cellule à cinq graines sans modifier les observations', () => {
  const rows = [100, 104, 98, 102, 101].map((finalMedian) => ({ finalMedian }));
  const summary = summarizeCellStability(rows);

  assert.equal(summary.seedCount, 5);
  assert.equal(summary.medianFinalValue, 101);
  assert.equal(summary.range, 6);
  assert.ok(Math.abs(summary.relativeDispersion - 6 / 101) < 1e-12);
  assert.equal(summary.stability, 'stable');
});

test('recommande des réplications ciblées selon la décroissance en racine de n', () => {
  assert.equal(recommendAdditionalSeeds(0.05, 5), 0);
  assert.equal(recommendAdditionalSeeds(0.16, 5), 15);
  assert.equal(recommendAdditionalSeeds(0.30, 5, { maximumSeeds: 25 }), 20);
});

test('calcule une interaction différence-de-différences', () => {
  const rows = [
    { reserve: 0, correlation: 0.1, finalMedian: 100 },
    { reserve: 6, correlation: 0.1, finalMedian: 110 },
    { reserve: 0, correlation: 0.75, finalMedian: 80 },
    { reserve: 6, correlation: 0.75, finalMedian: 84 },
  ];

  const result = calculateTwoFactorInteraction(rows, {
    factorA: 'reserve',
    lowA: 0,
    highA: 6,
    factorB: 'correlation',
    lowB: 0.1,
    highB: 0.75,
  });

  assert.equal(result.effectAWhenBLow, 10);
  assert.equal(result.effectAWhenBHigh, 4);
  assert.equal(result.interaction, -6);
  assert.ok(Math.abs(result.normalizedInteraction + 6 / 110) < 1e-12);
});

test('classe les interactions par amplitude normalisée absolue', () => {
  const ranked = rankInteractionAnalyses([
    { normalizedInteraction: 0.03, name: 'small' },
    { normalizedInteraction: -0.12, name: 'large' },
    { normalizedInteraction: 0.08, name: 'medium' },
  ]);

  assert.deepEqual(ranked.map((item) => item.name), ['large', 'medium', 'small']);
});

test('refuse une analyse avec cellule factorielle absente', () => {
  assert.throws(
    () => calculateTwoFactorInteraction(
      [{ a: 0, b: 0, finalMedian: 100 }],
      { factorA: 'a', lowA: 0, highA: 1, factorB: 'b', lowB: 0, highB: 1 },
    ),
    /empty factorial cell/,
  );
});
