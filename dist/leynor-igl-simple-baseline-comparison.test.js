import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCandidateWithBaselines } from './leynor-igl-simple-baseline-comparison.js';

test('compare le candidat à au moins deux références simples', () => {
  const result = compareCandidateWithBaselines({
    metric: 'mae',
    outcomes: [0, 1, 0, 1],
    candidate: [0.1, 0.8, 0.2, 0.9],
    baselines: {
      constantHalf: [0.5, 0.5, 0.5, 0.5],
      previousState: [0, 0, 1, 0],
    },
  });
  assert.equal(result.observationCount, 4);
  assert.equal(result.baselineScores.length, 2);
  assert.equal(result.candidateBeatsBestBaseline, true);
  assert.equal(result.externallyValidated, false);
  assert.equal(result.productionReady, false);
});

test('refuse une seule référence', () => {
  assert.throws(() => compareCandidateWithBaselines({
    outcomes: [0, 1],
    candidate: [0.2, 0.8],
    baselines: { only: [0.5, 0.5] },
  }), /at least two/);
});

test('calcule le Brier score sans déclarer de validation', () => {
  const result = compareCandidateWithBaselines({
    metric: 'brier',
    outcomes: [0, 1],
    candidate: [0.25, 0.75],
    baselines: {
      constantHalf: [0.5, 0.5],
      constantZero: [0, 0],
    },
  });
  assert.equal(result.candidateScore, 0.0625);
  assert.equal(result.externallyValidated, false);
});
