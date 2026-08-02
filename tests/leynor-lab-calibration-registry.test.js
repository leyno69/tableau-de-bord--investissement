import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCalibrationRecord,
  createCalibrationRegistry,
  restoreCalibrationRegistry
} from '../leynor-lab-calibration-registry.js';

function baseRecord(overrides = {}) {
  return {
    recordId: 'calibration-record-001',
    protocolId: 'confidence-v1',
    protocolVersion: '1.0.0',
    engineVersion: '6.0.0',
    targetConclusion: 'Stabilité de la probabilité d’atteinte d’objectif',
    status: 'validated',
    recordedAt: '2026-08-02T13:45:00.000Z',
    datasetFingerprint: 'datasets-a-b-c',
    resultFingerprint: 'result-001',
    calibrationCampaignIds: ['calibration-b', 'calibration-a'],
    holdoutCampaignIds: ['holdout-a'],
    criterionResults: [
      {
        criterionId: 'seed-stability',
        status: 'satisfied',
        observation: 'La règle calibrée est satisfaite sur les deux campagnes indépendantes.',
        calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001',
        holdoutValidated: true
      }
    ],
    decisionRationale: 'Validation enregistrée après reproduction et contrôle hors échantillon.',
    limitations: [
      'La calibration reste conditionnelle aux campagnes et hypothèses documentées.'
    ],
    supersedesRecordId: null,
    ...overrides
  };
}

test('crée une calibration validée immuable et ordonnée', () => {
  const record = createCalibrationRecord(baseRecord());

  assert.equal(record.status, 'validated');
  assert.deepEqual(record.calibrationCampaignIds, ['calibration-a', 'calibration-b']);
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.criterionResults), true);
});

test('refuse de valider un critère non satisfait ou non validé hors échantillon', () => {
  const unsatisfied = baseRecord({
    criterionResults: [{
      criterionId: 'seed-stability',
      status: 'unsatisfied',
      observation: 'Le critère échoue.',
      calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001',
      holdoutValidated: true
    }]
  });
  assert.throws(() => createCalibrationRecord(unsatisfied), /calibration validée exige/);

  const noHoldout = baseRecord({
    criterionResults: [{
      criterionId: 'seed-stability',
      status: 'satisfied',
      observation: 'Le critère est satisfait.',
      calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001',
      holdoutValidated: false
    }]
  });
  assert.throws(() => createCalibrationRecord(noHoldout), /calibration validée exige/);
});

test('ajoute de manière idempotente et rejette les conflits', () => {
  const registry = createCalibrationRegistry().add(baseRecord());
  const duplicate = registry.add(baseRecord());
  assert.deepEqual(duplicate.records, registry.records);

  assert.throws(() => registry.add(baseRecord({ status: 'rejected' })), /Conflit de calibration/);
  assert.throws(() => registry.add(baseRecord({
    recordId: 'calibration-record-002'
  })), /resultFingerprint déjà enregistré/);
});

test('conserve un historique de remplacement et retrouve la dernière validation', () => {
  const first = baseRecord();
  const second = baseRecord({
    recordId: 'calibration-record-002',
    recordedAt: '2026-08-03T09:00:00.000Z',
    resultFingerprint: 'result-002',
    supersedesRecordId: 'calibration-record-001'
  });

  const registry = createCalibrationRegistry().add(first).add(second);

  assert.equal(registry.latestValidated('confidence-v1').recordId, 'calibration-record-002');
  assert.equal(registry.findByProtocol('confidence-v1').length, 2);
  assert.throws(() => createCalibrationRegistry().add(second), /remplacée introuvable/);
});

test('sérialise et restaure de manière déterministe', () => {
  const registry = createCalibrationRegistry([baseRecord()]);
  const restored = restoreCalibrationRegistry(registry.serialize());

  assert.deepEqual(restored.records, registry.records);
  assert.equal(restored.serialize(), registry.serialize());
  assert.throws(() => restoreCalibrationRegistry('{'), /JSON invalide/);
  assert.throws(
    () => restoreCalibrationRegistry(JSON.stringify({ schemaVersion: 2, records: [] })),
    /incompatible/
  );
});

test('refuse les campagnes dupliquées ou utilisées dans deux rôles', () => {
  assert.throws(() => createCalibrationRecord(baseRecord({
    calibrationCampaignIds: ['calibration-a', 'calibration-a']
  })), /calibrationCampaignId dupliqué/);

  assert.throws(() => createCalibrationRecord(baseRecord({
    holdoutCampaignIds: ['calibration-a']
  })), /ne peut pas être calibration et holdout/);
});
