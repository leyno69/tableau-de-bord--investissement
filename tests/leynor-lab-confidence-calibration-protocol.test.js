import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfidenceCalibrationProtocol } from '../leynor-lab-confidence-calibration-protocol.js';

function baseInput() {
  return {
    protocolId: 'confidence-v1',
    protocolVersion: '1.0.0',
    targetConclusion: 'Stabilité de la probabilité d’atteinte d’objectif',
    campaigns: [
      {
        campaignId: 'calibration-a',
        datasetFingerprint: 'dataset-a',
        engineVersion: '6.0.0',
        role: 'calibration',
        seedCount: 8,
        observationCount: 5000,
        reproducible: true,
        methodologyEligible: true
      },
      {
        campaignId: 'calibration-b',
        datasetFingerprint: 'dataset-b',
        engineVersion: '6.0.0',
        role: 'calibration',
        seedCount: 8,
        observationCount: 5000,
        reproducible: true,
        methodologyEligible: true
      },
      {
        campaignId: 'holdout-a',
        datasetFingerprint: 'dataset-c',
        engineVersion: '6.0.0',
        role: 'holdout',
        seedCount: 8,
        observationCount: 5000,
        reproducible: true,
        methodologyEligible: true
      }
    ],
    criteria: [
      {
        criterionId: 'seed-stability',
        measuredProperty: 'Dispersion entre graines',
        calibrationMethod: 'Comparer la dispersion sur plusieurs campagnes indépendantes.',
        acceptanceRule: 'Règle à calibrer sur les campagnes documentées, sans seuil choisi manuellement.',
        minimumIndependentCampaigns: 2,
        minimumSeedsPerCampaign: 5,
        minimumObservationsPerCampaign: 1000,
        holdoutRequired: true,
        calibrationReference: 'LEYNOR-CAL-SEED-STABILITY-001'
      }
    ]
  };
}

test('déclare le protocole prêt lorsque les campagnes indépendantes et le holdout sont éligibles', () => {
  const result = buildConfidenceCalibrationProtocol(baseInput());

  assert.equal(result.isReadyForCalibration, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.evaluations[0].status, 'ready-for-calibration');
  assert.equal(result.evaluations[0].independentEligibleCampaignCount, 2);
  assert.equal(result.evaluations[0].holdoutAvailable, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.campaigns), true);
});

test('bloque une calibration lorsque les campagnes ne sont pas indépendantes', () => {
  const input = baseInput();
  input.campaigns[1].datasetFingerprint = 'dataset-a';

  const result = buildConfidenceCalibrationProtocol(input);

  assert.equal(result.isReadyForCalibration, false);
  assert.ok(result.blockers.includes('criterion-blocked'));
  assert.equal(result.evaluations[0].status, 'blocked');
  assert.ok(result.evaluations[0].blockers.includes('insufficient-independent-campaigns'));
});

test('bloque un critère nécessitant un holdout lorsqu’aucun holdout éligible n’existe', () => {
  const input = baseInput();
  input.campaigns[2].methodologyEligible = false;

  const result = buildConfidenceCalibrationProtocol(input);

  assert.equal(result.evaluations[0].status, 'blocked');
  assert.ok(result.evaluations[0].blockers.includes('missing-eligible-holdout'));
});

test('est déterministe quel que soit l’ordre des campagnes et critères', () => {
  const input = baseInput();
  const reversed = {
    ...input,
    campaigns: [...input.campaigns].reverse(),
    criteria: [...input.criteria].reverse()
  };

  assert.deepEqual(
    buildConfidenceCalibrationProtocol(input),
    buildConfidenceCalibrationProtocol(reversed)
  );
});

test('refuse les identifiants dupliqués et les rôles inconnus', () => {
  const duplicate = baseInput();
  duplicate.campaigns[1].campaignId = duplicate.campaigns[0].campaignId;
  assert.throws(() => buildConfidenceCalibrationProtocol(duplicate), /campaignId dupliqué/);

  const unknownRole = baseInput();
  unknownRole.campaigns[0].role = 'production';
  assert.throws(() => buildConfidenceCalibrationProtocol(unknownRole), /Rôle de campagne inconnu/);
});
