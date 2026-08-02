import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceCalibrationProtocol } from '../leynor-lab-evidence-calibration-protocol.js';

function baseInput() {
  const study = (studyId, datasetFingerprint, role) => ({
    studyId,
    datasetFingerprint,
    role,
    independentSourceCount: 3,
    reproducedConclusionCount: 2,
    contradictionCount: 1,
    contradictionsReviewed: true,
    methodologyEligible: true,
    reproducible: true
  });
  return {
    protocolId: 'evidence-v1',
    protocolVersion: '1.0.0',
    conclusionId: 'conclusion-resilience-001',
    studies: [study('calibration-a', 'dataset-a', 'calibration'), study('calibration-b', 'dataset-b', 'calibration'), study('holdout-a', 'dataset-c', 'holdout')],
    criteria: [{
      criterionId: 'independent-reproduction',
      measuredProperty: 'Reproduction indépendante de la conclusion',
      calibrationMethod: 'Comparer plusieurs études indépendantes et un holdout séparé.',
      acceptanceRule: 'Règle à calibrer empiriquement sans seuil arbitraire.',
      calibrationReference: 'LEYNOR-EVIDENCE-CAL-001',
      minimumIndependentStudies: 2,
      minimumIndependentSourcesPerStudy: 2,
      minimumReproducedConclusionsPerStudy: 1,
      holdoutRequired: true,
      contradictionsMustBeReviewed: true
    }]
  };
}

test('déclare le protocole prêt avec études indépendantes, holdout et contradictions revues', () => {
  const result = buildEvidenceCalibrationProtocol(baseInput());
  assert.equal(result.isReadyForCalibration, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.evaluations[0].status, 'ready-for-calibration');
  assert.equal(result.evaluations[0].independentEligibleStudyCount, 2);
  assert.equal(Object.isFrozen(result), true);
});

test('bloque des études non indépendantes', () => {
  const input = baseInput();
  input.studies[1].datasetFingerprint = 'dataset-a';
  const result = buildEvidenceCalibrationProtocol(input);
  assert.equal(result.isReadyForCalibration, false);
  assert.ok(result.blockers.includes('criterion-blocked'));
  assert.ok(result.evaluations[0].blockers.includes('insufficient-independent-studies'));
});

test('bloque si le holdout est inéligible', () => {
  const input = baseInput();
  input.studies[2].methodologyEligible = false;
  const result = buildEvidenceCalibrationProtocol(input);
  assert.ok(result.evaluations[0].blockers.includes('missing-eligible-holdout'));
});

test('bloque si les contradictions ne sont pas revues', () => {
  const input = baseInput();
  input.studies[1].contradictionsReviewed = false;
  const result = buildEvidenceCalibrationProtocol(input);
  assert.ok(result.evaluations[0].blockers.includes('contradictions-not-reviewed'));
});

test('est déterministe quel que soit l’ordre des entrées', () => {
  const input = baseInput();
  assert.deepEqual(buildEvidenceCalibrationProtocol(input), buildEvidenceCalibrationProtocol({
    ...input,
    studies: [...input.studies].reverse(),
    criteria: [...input.criteria].reverse()
  }));
});

test('refuse les doublons et rôles inconnus', () => {
  const duplicate = baseInput();
  duplicate.studies[1].studyId = duplicate.studies[0].studyId;
  assert.throws(() => buildEvidenceCalibrationProtocol(duplicate), /studyId dupliqué/);
  const unknown = baseInput();
  unknown.studies[0].role = 'production';
  assert.throws(() => buildEvidenceCalibrationProtocol(unknown), /Rôle d’étude inconnu/);
});
