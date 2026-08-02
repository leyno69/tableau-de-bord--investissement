import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvidenceCalibrationRecord,
  createEvidenceCalibrationRegistry,
  restoreEvidenceCalibrationRegistry
} from '../leynor-lab-evidence-calibration-registry.js';

function baseRecord(overrides = {}) {
  return {
    recordId: 'evidence-calibration-001',
    protocolId: 'evidence-v1',
    protocolVersion: '1.0.0',
    conclusionId: 'conclusion-001',
    engineVersion: '6.0.0',
    status: 'validated',
    recordedAt: '2026-08-02T14:20:00.000Z',
    datasetFingerprint: 'datasets-a-b-c',
    resultFingerprint: 'evidence-result-001',
    criterionResults: [{
      criterionId: 'independent-reproduction',
      status: 'satisfied',
      observation: 'Conclusion reproduite sur deux études indépendantes et un holdout.',
      calibrationReference: 'LEYNOR-EVIDENCE-CAL-001',
      independentStudyIds: ['study-b', 'study-a'],
      holdoutStudyId: 'holdout-a',
      contradictionsReviewed: true
    }],
    decisionRationale: 'Validation enregistrée après reproduction indépendante et revue des contradictions.',
    limitations: ['La conclusion reste conditionnelle aux études et hypothèses documentées.'],
    supersedesRecordId: null,
    ...overrides
  };
}

test('crée un enregistrement validé immuable et ordonné', () => {
  const record = createEvidenceCalibrationRecord(baseRecord());
  assert.equal(record.status, 'validated');
  assert.deepEqual(record.criterionResults[0].independentStudyIds, ['study-a', 'study-b']);
  assert.equal(Object.isFrozen(record), true);
});

test('refuse une validation sans critère satisfait ou contradictions revues', () => {
  assert.throws(() => createEvidenceCalibrationRecord(baseRecord({
    criterionResults: [{ ...baseRecord().criterionResults[0], status: 'unsatisfied' }]
  })), /calibration validée exige/);
  assert.throws(() => createEvidenceCalibrationRecord(baseRecord({
    criterionResults: [{ ...baseRecord().criterionResults[0], contradictionsReviewed: false }]
  })), /calibration validée exige/);
});

test('ajoute de manière idempotente et rejette les conflits', () => {
  const registry = createEvidenceCalibrationRegistry().add(baseRecord());
  assert.deepEqual(registry.add(baseRecord()).records, registry.records);
  assert.throws(() => registry.add(baseRecord({ status: 'rejected' })), /Conflit de calibration/);
  assert.throws(() => registry.add(baseRecord({ recordId: 'evidence-calibration-002' })), /resultFingerprint déjà enregistré/);
});

test('conserve les remplacements et retrouve la dernière validation', () => {
  const second = baseRecord({
    recordId: 'evidence-calibration-002',
    recordedAt: '2026-08-03T10:00:00.000Z',
    resultFingerprint: 'evidence-result-002',
    supersedesRecordId: 'evidence-calibration-001'
  });
  const registry = createEvidenceCalibrationRegistry().add(baseRecord()).add(second);
  assert.equal(registry.latestValidated('conclusion-001').recordId, 'evidence-calibration-002');
  assert.throws(() => createEvidenceCalibrationRegistry().add(second), /remplacée introuvable/);
});

test('sérialise et restaure de manière déterministe', () => {
  const registry = createEvidenceCalibrationRegistry([baseRecord()]);
  const restored = restoreEvidenceCalibrationRegistry(registry.serialize());
  assert.deepEqual(restored.records, registry.records);
  assert.equal(restored.serialize(), registry.serialize());
  assert.throws(() => restoreEvidenceCalibrationRegistry('{'), /JSON invalide/);
});
