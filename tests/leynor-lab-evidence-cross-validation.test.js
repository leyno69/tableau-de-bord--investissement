import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvidenceCalibrations } from '../leynor-lab-evidence-cross-validation.js';

function record(overrides = {}) {
  return {
    recordId: 'evidence-calibration-001',
    protocolId: 'evidence-v1',
    protocolVersion: '1.0.0',
    conclusionId: 'diversification-resilience',
    engineVersion: '6.0.0',
    datasetFingerprint: 'dataset-a',
    status: 'validated',
    criterionResults: [{
      criterionId: 'independent-reproduction',
      status: 'satisfied',
      holdoutStudyId: 'holdout-a',
      contradictionsReviewed: true
    }],
    ...overrides
  };
}

test('valide des calibrations concordantes et indépendantes', () => {
  const result = validateEvidenceCalibrations([
    record(),
    record({ recordId: 'evidence-calibration-002', datasetFingerprint: 'dataset-b', holdoutStudyId: 'holdout-b' })
  ]);
  assert.equal(result.isCrossValidated, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(Object.isFrozen(result), true);
});

test('bloque les jeux de données non indépendants', () => {
  const result = validateEvidenceCalibrations([
    record(),
    record({ recordId: 'evidence-calibration-002' })
  ]);
  assert.equal(result.isCrossValidated, false);
  assert.ok(result.blockers.includes('datasets-not-independent'));
});

test('détecte les statuts contradictoires et la couverture incomplète', () => {
  const result = validateEvidenceCalibrations([
    record(),
    record({
      recordId: 'evidence-calibration-002',
      datasetFingerprint: 'dataset-b',
      criterionResults: [{
        criterionId: 'independent-reproduction',
        status: 'unsatisfied',
        holdoutStudyId: 'holdout-b',
        contradictionsReviewed: true
      }, {
        criterionId: 'historical-consistency',
        status: 'satisfied',
        holdoutStudyId: 'holdout-b',
        contradictionsReviewed: true
      }]
    })
  ]);
  const first = result.evaluations.find(item => item.criterionId === 'independent-reproduction');
  const second = result.evaluations.find(item => item.criterionId === 'historical-consistency');
  assert.ok(first.blockers.includes('contradictory-criterion-statuses'));
  assert.ok(second.blockers.includes('incomplete-criterion-coverage'));
});

test('refuse les calibrations non comparables et les doublons', () => {
  assert.throws(() => validateEvidenceCalibrations([
    record(),
    record({ recordId: 'evidence-calibration-002', protocolId: 'other', datasetFingerprint: 'dataset-b' })
  ]), /même protocole/);
  assert.throws(() => validateEvidenceCalibrations([record(), record()]), /recordId dupliqué/);
});

test('le résultat est déterministe', () => {
  const records = [
    record({ recordId: 'evidence-calibration-002', datasetFingerprint: 'dataset-b' }),
    record()
  ];
  assert.deepEqual(validateEvidenceCalibrations(records), validateEvidenceCalibrations([...records].reverse()));
});
