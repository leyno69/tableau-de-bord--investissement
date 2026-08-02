import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMethodologySynthesis } from '../../leynor-lab-methodology-synthesis.js';

function completeInput() {
  return {
    sample: {
      observationCount: 50000,
      seedCount: 5,
      expectedSeedCount: 5,
      metricCoverage: 1
    },
    seedStability: {
      incompleteMetricCount: 0,
      maximumCoefficientOfVariation: 0.08
    },
    sensitivity: {
      experimentCount: 12,
      parameterCount: 4
    }
  };
}

test('synthétise la couverture sans fabriquer de niveau de confiance', () => {
  const result = buildMethodologySynthesis(completeInput());

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.isComplete, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.checks.length, 5);
  assert.equal('confidenceLevel' in result, false);
  assert.equal('evidenceLevel' in result, false);
  assert.equal('igl' in result, false);
});

test('signale explicitement les lacunes méthodologiques', () => {
  const input = completeInput();
  input.sample.seedCount = 3;
  input.sample.metricCoverage = 0.8;
  input.seedStability.incompleteMetricCount = 2;
  input.sensitivity.experimentCount = 0;
  input.sensitivity.parameterCount = 0;

  const result = buildMethodologySynthesis(input);

  assert.equal(result.isComplete, false);
  assert.deepEqual(result.blockers, [
    'seed-coverage',
    'metric-coverage',
    'assumption-sensitivity'
  ]);
});

test('le résultat est déterministe et profondément immuable', () => {
  const first = buildMethodologySynthesis(completeInput());
  const second = buildMethodologySynthesis(completeInput());

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.checks), true);
  assert.equal(Object.isFrozen(first.checks[0]), true);
  assert.throws(() => first.blockers.push('fake'), TypeError);
});

test('refuse les données incohérentes', () => {
  const tooManySeeds = completeInput();
  tooManySeeds.sample.seedCount = 6;
  assert.throws(() => buildMethodologySynthesis(tooManySeeds), /ne peut pas dépasser/);

  const invalidCoverage = completeInput();
  invalidCoverage.sample.metricCoverage = 1.2;
  assert.throws(() => buildMethodologySynthesis(invalidCoverage), /compris entre 0 et 1/);

  const invalidSensitivity = completeInput();
  invalidSensitivity.sensitivity.experimentCount = 2;
  invalidSensitivity.sensitivity.parameterCount = 3;
  assert.throws(() => buildMethodologySynthesis(invalidSensitivity), /ne peut pas dépasser/);
});
