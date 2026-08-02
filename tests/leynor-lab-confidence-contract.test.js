import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfidenceContract } from '../leynor-lab-confidence-contract.js';

const protocol = {
  id: 'leynor-confidence-calibration',
  version: '0.1.0',
  description: 'Protocole expérimental préalable à toute classification de confiance.'
};

const completeMethodology = { isComplete: true };

function criterion(overrides = {}) {
  return {
    id: 'seed-stability',
    label: 'Stabilité entre graines',
    method: 'Comparer la dispersion de métriques identiques entre graines indépendantes.',
    acceptanceRule: 'Règle à appliquer uniquement après calibration sur plusieurs campagnes indépendantes.',
    calibrationReference: 'campaign-set-2026-01',
    status: 'satisfied',
    observation: 'La règle calibrée est satisfaite pour la campagne analysée.',
    limitations: ['La stabilité entre graines ne couvre pas la stabilité entre périodes.'],
    ...overrides
  };
}

test('rend une étude seulement éligible à la calibration sans créer de score', () => {
  const result = buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [criterion()]
  });

  assert.equal(result.conclusion, 'eligible-for-confidence-calibration');
  assert.equal(result.confidenceLevel, null);
  assert.equal(result.confidenceScore, null);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.satisfiedCriterionCount, 1);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.criteria));
});

test('bloque une étude incomplète, non calibrée ou non évaluée', () => {
  const result = buildConfidenceContract({
    methodologySynthesis: { isComplete: false },
    protocol,
    criteria: [criterion({ calibrationReference: null, status: 'not-evaluated' })]
  });

  assert.equal(result.conclusion, 'blocked');
  assert.deepEqual(result.blockers, [
    'methodology-incomplete',
    'uncalibrated:seed-stability',
    'not-evaluated:seed-stability'
  ]);
});

test('bloque un critère calibré mais non satisfait', () => {
  const result = buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [criterion({ status: 'unsatisfied' })]
  });

  assert.equal(result.conclusion, 'blocked');
  assert.deepEqual(result.unsatisfiedCriteria, ['seed-stability']);
});

test('produit un résultat déterministe indépendamment de l’ordre des critères', () => {
  const second = criterion({
    id: 'sample-size',
    label: 'Taille d’échantillon',
    observation: 'La règle calibrée de taille d’échantillon est satisfaite.'
  });

  const left = buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [criterion(), second]
  });
  const right = buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [second, criterion()]
  });

  assert.deepEqual(left, right);
});

test('refuse les critères dupliqués et les statuts inconnus', () => {
  assert.throws(() => buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [criterion(), criterion()]
  }), /Critère dupliqué/);

  assert.throws(() => buildConfidenceContract({
    methodologySynthesis: completeMethodology,
    protocol,
    criteria: [criterion({ status: 'high' })]
  }), /status doit être satisfied/);
});
