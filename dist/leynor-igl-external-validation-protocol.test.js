import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditExternalValidationReadiness,
  auditTemporalAvailability,
  createExternalValidationProtocol,
} from './leynor-igl-external-validation-protocol.js';

const baseInput = {
  protocolId: 'igl-external-validation-001',
  version: '1.0.0',
  registeredAt: '2026-08-02',
  constructDefinition: 'Mesurer la robustesse structurelle d’un portefeuille et sa capacité documentée à résister à des chocs sans prétendre prédire son rendement futur.',
  primaryOutcomes: [
    'maximum-drawdown-observed',
    'forced-sale-occurrence',
    'recovery-duration',
  ],
  splits: [
    {
      role: 'development',
      datasetId: 'dataset-dev-001',
      datasetFingerprint: 'sha256:dev',
      startDate: '2005-01-01',
      endDate: '2014-12-31',
    },
    {
      role: 'validation',
      datasetId: 'dataset-validation-001',
      datasetFingerprint: 'sha256:validation',
      startDate: '2015-01-01',
      endDate: '2019-12-31',
    },
    {
      role: 'locked-test',
      datasetId: 'dataset-test-001',
      datasetFingerprint: 'sha256:test',
      startDate: '2020-01-01',
      endDate: '2025-12-31',
      locked: true,
    },
  ],
  baselines: [
    'line-count-only',
    'maximum-position-weight',
    'historical-volatility-only',
  ],
  acceptanceCriteria: [
    'beat-at-least-two-simple-baselines-on-locked-test',
    'no-major-subgroup-degradation',
    'temporal-leakage-audit-passed',
  ],
  prohibitedAdjustments: [
    'no-threshold-change-after-locked-test-unblinding',
    'no-feature-selection-on-locked-test',
    'no-retrospective-outcome-redefinition',
  ],
  independentReviewerRequired: true,
};

test('crée un protocole préenregistré, déterministe et non productif', () => {
  const protocol = createExternalValidationProtocol(baseInput);
  assert.equal(protocol.status, 'preregistered-not-executed');
  assert.equal(protocol.productionScoreAllowed, false);
  assert.equal(protocol.splits[2].role, 'locked-test');
  assert.equal(protocol.splits[2].locked, true);
  assert.equal(Object.isFrozen(protocol), true);
  assert.deepEqual(protocol, createExternalValidationProtocol(baseInput));
});

test('refuse des jeux de données non indépendants', () => {
  const duplicated = structuredClone(baseInput);
  duplicated.splits[2].datasetFingerprint = duplicated.splits[1].datasetFingerprint;
  assert.throws(
    () => createExternalValidationProtocol(duplicated),
    /must be independent/,
  );
});

test('refuse un test final déverrouillé', () => {
  const unlocked = structuredClone(baseInput);
  unlocked.splits[2].locked = false;
  assert.throws(
    () => createExternalValidationProtocol(unlocked),
    /must remain locked/,
  );
});

test('détecte les fuites temporelles sans inventer de correction', () => {
  const audit = auditTemporalAvailability([
    {
      field: 'portfolio-weight',
      observationDate: '2020-03-31',
      availableAt: '2020-03-31',
    },
    {
      field: 'annual-report-ratio',
      observationDate: '2020-03-31',
      availableAt: '2020-04-15',
    },
  ]);

  assert.equal(audit.recordCount, 2);
  assert.equal(audit.violationCount, 1);
  assert.equal(audit.passed, false);
  assert.equal(audit.violations[0].field, 'annual-report-ratio');
  assert.match(audit.violations[0].reason, /not available/);
});

test('autorise l’acquisition de données mais jamais la production', () => {
  const protocol = createExternalValidationProtocol(baseInput);
  const readiness = auditExternalValidationReadiness(protocol);
  assert.equal(readiness.readyForDataAcquisition, true);
  assert.equal(readiness.readyForProduction, false);
  assert.deepEqual(readiness.blockers, []);
  assert.match(readiness.nextStep, /point-in-time datasets/);
});

test('exige plusieurs modèles de référence simples', () => {
  const protocol = createExternalValidationProtocol({
    ...baseInput,
    baselines: ['line-count-only'],
  });
  const readiness = auditExternalValidationReadiness(protocol);
  assert.equal(readiness.readyForDataAcquisition, false);
  assert.ok(readiness.blockers.includes('at-least-two-baselines-required'));
});
