import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvidenceClassificationRecord,
  createEvidenceClassificationRegistry,
  restoreEvidenceClassificationRegistry
} from './leynor-lab-evidence-classification-registry.js';

function record(overrides = {}) {
  return {
    recordId: 'classification-1', conclusionId: 'conclusion-1', level: 'moderate',
    ruleId: 'rule-1', ruleVersion: '1.0.0', calibrationReference: 'calibration-1',
    crossValidationReference: 'cross-validation-1', classifierVersion: '1.0.0',
    resultFingerprint: 'fingerprint-1', recordedAt: '2026-08-02T14:00:00Z',
    blockers: [], rationale: 'Règle calibrée correspondante.', limitations: ['Validité limitée au domaine étudié.'],
    ...overrides
  };
}

test('crée un enregistrement immuable et traçable', () => {
  const value = createEvidenceClassificationRecord(record());
  assert.equal(value.level, 'moderate');
  assert.equal(value.ruleId, 'rule-1');
  assert.ok(Object.isFrozen(value));
});

test('refuse une classification attribuée avec blocage actif', () => {
  assert.throws(() => createEvidenceClassificationRecord(record({ blockers: ['contradiction'] })), /blocage actif/);
});

test('autorise un résultat non classé sans règle inventée', () => {
  const value = createEvidenceClassificationRecord(record({ level: 'unclassified', blockers: ['missing-rule'] }));
  assert.equal(value.ruleId, null);
  assert.deepEqual(value.blockers, ['missing-rule']);
});

test('ajout idempotent, conflit explicite et restauration déterministe', () => {
  const registry = createEvidenceClassificationRegistry().add(record());
  assert.equal(registry.add(record()).records.length, 1);
  assert.throws(() => registry.add(record({ rationale: 'Autre justification.' })), /Conflit/);
  const restored = restoreEvidenceClassificationRegistry(registry.serialize());
  assert.deepEqual(restored.records, registry.records);
  assert.equal(restored.latest('conclusion-1').recordId, 'classification-1');
});

test('exige une référence existante lors du remplacement', () => {
  const registry = createEvidenceClassificationRegistry();
  assert.throws(() => registry.add(record({ recordId: 'classification-2', resultFingerprint: 'fingerprint-2', supersedesRecordId: 'missing' })), /introuvable/);
});
