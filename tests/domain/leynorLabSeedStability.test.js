import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSeedStability } from '../../leynor-lab-seed-stability.js';

const observations = [
  { seed: 303, metrics: { finalValue: 102000, goalProbability: 0.66, maxDrawdown: 0.31 } },
  { seed: 101, metrics: { finalValue: 100000, goalProbability: 0.64, maxDrawdown: 0.30 } },
  { seed: 202, metrics: { finalValue: 101000, goalProbability: 0.65, maxDrawdown: 0.29 } }
];

test('mesure la dispersion entre graines sans fabriquer de score de confiance', () => {
  const result = analyzeSeedStability({ campaignId: 'campaign-resilience', observations });

  assert.equal(result.seedCount, 3);
  assert.equal(result.sufficientSeedCount, true);
  assert.deepEqual(result.seeds, [101, 202, 303]);
  assert.equal(result.metrics.finalValue.mean, 101000);
  assert.equal(result.metrics.goalProbability.observationCount, 3);
  assert.ok(result.metrics.finalValue.coefficientOfVariation > 0);
  assert.ok(result.metrics.finalValue.relativeRange > 0);
  assert.match(result.limitations.join(' '), /ni un niveau de confiance/i);
  assert.equal('confidenceScore' in result, false);
  assert.equal('evidenceScore' in result, false);
  assert.equal('igl' in result, false);
});

test('est déterministe et immuable indépendamment de l’ordre des observations', () => {
  const first = analyzeSeedStability({ campaignId: 'campaign-resilience', observations });
  const second = analyzeSeedStability({ campaignId: 'campaign-resilience', observations: [...observations].reverse() });

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.metrics.finalValue.valuesBySeed), true);
  assert.throws(() => { first.seeds.push(404); }, TypeError);
});

test('signale une couverture incomplète sans inventer la valeur absente', () => {
  const result = analyzeSeedStability({
    campaignId: 'campaign-partial',
    observations: [
      { seed: 1, metrics: { finalValue: 100 } },
      { seed: 2, metrics: { finalValue: 105, recoveryMonths: 18 } },
      { seed: 3, metrics: { finalValue: 95 } }
    ]
  });

  assert.deepEqual(result.incompleteMetrics, ['recoveryMonths']);
  assert.equal(result.metrics.recoveryMonths.observationCount, 1);
  assert.equal(result.metrics.recoveryMonths.seedCoverage, 1 / 3);
});

test('refuse les graines dupliquées et les données invalides', () => {
  assert.throws(
    () => analyzeSeedStability({ campaignId: 'x', observations: [observations[0], observations[0]] }),
    /graine doit être unique/
  );
  assert.throws(
    () => analyzeSeedStability({ campaignId: 'x', observations: [{ seed: 1, metrics: { value: NaN } }, { seed: 2, metrics: { value: 1 } }] }),
    /nombre fini/
  );
  assert.throws(
    () => analyzeSeedStability({ campaignId: 'x', observations: [{ seed: 1, metrics: {} }, { seed: 2, metrics: { value: 1 } }] }),
    /au moins une métrique/
  );
});
