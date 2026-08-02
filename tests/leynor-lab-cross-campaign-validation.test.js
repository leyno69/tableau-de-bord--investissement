import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAcrossCalibrationRecords } from '../leynor-lab-cross-campaign-validation.js';

function record(id, dataset, overrides = {}) {
  return {
    recordId: id,
    protocolId: 'confidence-v1',
    protocolVersion: '1.0.0',
    engineVersion: '6.0.0',
    targetConclusion: 'Stabilité de la probabilité d’atteinte d’objectif',
    datasetFingerprint: dataset,
    resultFingerprint: `result-${id}`,
    criterionResults: [{
      criterionId: 'seed-stability',
      status: 'satisfied',
      holdoutValidated: true,
      calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001'
    }],
    ...overrides
  };
}

test('déclare concordantes des calibrations indépendantes et homogènes', () => {
  const result = validateAcrossCalibrationRecords({
    validationId: 'cross-validation-001',
    records: [record('record-b', 'dataset-b'), record('record-a', 'dataset-a')]
  });

  assert.equal(result.isConcordant, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.criteria[0].concordant, true);
  assert.equal(result.independentDatasetCount, 2);
  assert.deepEqual(result.records.map(item => item.recordId), ['record-a', 'record-b']);
  assert.equal(Object.isFrozen(result), true);
});

test('détecte une contradiction entre critères', () => {
  const contradictory = record('record-b', 'dataset-b', {
    criterionResults: [{
      criterionId: 'seed-stability',
      status: 'unsatisfied',
      holdoutValidated: true,
      calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001'
    }]
  });

  const result = validateAcrossCalibrationRecords({
    validationId: 'cross-validation-002',
    records: [record('record-a', 'dataset-a'), contradictory]
  });

  assert.equal(result.isConcordant, false);
  assert.equal(result.criteria[0].contradictory, true);
  assert.ok(result.criteria[0].blockers.includes('contradictory-results'));
});

test('détecte les couvertures et validations holdout incomplètes', () => {
  const incomplete = record('record-b', 'dataset-b', {
    criterionResults: [{
      criterionId: 'assumption-sensitivity',
      status: 'satisfied',
      holdoutValidated: false,
      calibrationReference: 'LEYNOR-CAL-SENSITIVITY-001'
    }]
  });

  const result = validateAcrossCalibrationRecords({
    validationId: 'cross-validation-003',
    records: [record('record-a', 'dataset-a'), incomplete]
  });

  assert.equal(result.isConcordant, false);
  assert.ok(result.criteria.some(item => item.blockers.includes('incomplete-criterion-coverage')));
  assert.ok(result.criteria.some(item => item.blockers.includes('incomplete-holdout-validation')));
});

test('bloque les jeux de données non indépendants et versions de protocole divergentes', () => {
  const result = validateAcrossCalibrationRecords({
    validationId: 'cross-validation-004',
    records: [
      record('record-a', 'dataset-a'),
      record('record-b', 'dataset-a', { protocolVersion: '2.0.0' })
    ]
  });

  assert.ok(result.blockers.includes('datasets-not-independent'));
  assert.ok(result.blockers.includes('protocol-version-mismatch'));
});

test('est déterministe quel que soit l’ordre des entrées', () => {
  const records = [record('record-a', 'dataset-a'), record('record-b', 'dataset-b')];
  assert.deepEqual(
    validateAcrossCalibrationRecords({ validationId: 'cross-validation-005', records }),
    validateAcrossCalibrationRecords({ validationId: 'cross-validation-005', records: [...records].reverse() })
  );
});

test('refuse les doublons et les calibrations non comparables', () => {
  assert.throws(() => validateAcrossCalibrationRecords({
    validationId: 'cross-validation-006',
    records: [record('record-a', 'dataset-a'), record('record-a', 'dataset-b')]
  }), /recordId dupliqué/);

  assert.throws(() => validateAcrossCalibrationRecords({
    validationId: 'cross-validation-007',
    records: [
      record('record-a', 'dataset-a'),
      record('record-b', 'dataset-b', { protocolId: 'confidence-v2' })
    ]
  }), /même protocolId/);

  assert.throws(() => validateAcrossCalibrationRecords({
    validationId: 'cross-validation-008',
    records: [
      record('record-a', 'dataset-a'),
      record('record-b', 'dataset-b', { targetConclusion: 'Autre conclusion' })
    ]
  }), /même conclusion/);
});
