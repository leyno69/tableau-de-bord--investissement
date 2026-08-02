import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTemporalLeakage, createTemporalLeakagePipeline } from './leynor-igl-temporal-leakage-pipeline.js';

const registry = {
  registryId: 'registry-001',
  sources: [{
    sourceId: 'source-a',
    fingerprint: `sha256:${'a'.repeat(64)}`,
    availability: { releasedAtField: 'released_at' },
  }],
};

const pipeline = createTemporalLeakagePipeline({
  pipelineId: 'pipeline-001',
  version: '1.0.0',
  registryId: registry.registryId,
  registryFingerprint: `sha256:${'b'.repeat(64)}`,
  timestampPrecision: 'date',
  revisionMode: 'first-release',
});

const validRecord = {
  recordId: 'record-001',
  sourceId: 'source-a',
  field: 'price',
  observedAt: '2020-03-31',
  releasedAt: '2020-03-31',
  ingestedAt: '2020-03-31',
  revisionNumber: 0,
  isFirstRelease: true,
  sourceFingerprint: `sha256:${'a'.repeat(64)}`,
  transformationId: 'identity-v1',
};

test('crée un pipeline déterministe, fermé par défaut et non productif', () => {
  assert.equal(pipeline.failClosed, true);
  assert.equal(pipeline.status, 'configured-not-executed');
  assert.equal(pipeline.productionScoreAllowed, false);
  assert.equal(Object.isFrozen(pipeline), true);
});

test('accepte uniquement des données disponibles au moment observé', () => {
  const audit = auditTemporalLeakage({ pipeline, registry, records: [validRecord] });
  assert.equal(audit.passed, true);
  assert.equal(audit.eligibleForDatasetSplitting, true);
  assert.equal(audit.readyForExternalValidation, false);
});

test('bloque une publication postérieure à la date observée', () => {
  const audit = auditTemporalLeakage({
    pipeline,
    registry,
    records: [{ ...validRecord, releasedAt: '2020-04-15' }],
  });
  assert.equal(audit.passed, false);
  assert.equal(audit.blocked, true);
  assert.ok(audit.violations.some((violation) => violation.code === 'released-after-observation'));
});

test('bloque les révisions postérieures en mode première publication', () => {
  const audit = auditTemporalLeakage({
    pipeline,
    registry,
    records: [{ ...validRecord, revisionNumber: 2, isFirstRelease: false }],
  });
  assert.ok(audit.violations.some((violation) => violation.code === 'post-release-revision-used'));
});

test('bloque une source non enregistrée et une empreinte divergente', () => {
  const unknown = auditTemporalLeakage({
    pipeline,
    registry,
    records: [{ ...validRecord, sourceId: 'source-unknown' }],
  });
  assert.ok(unknown.violations.some((violation) => violation.code === 'unregistered-source'));

  const mismatch = auditTemporalLeakage({
    pipeline,
    registry,
    records: [{ ...validRecord, sourceFingerprint: `sha256:${'c'.repeat(64)}` }],
  });
  assert.ok(mismatch.violations.some((violation) => violation.code === 'source-fingerprint-mismatch'));
});

test('refuse les identifiants de ligne dupliqués', () => {
  assert.throws(
    () => auditTemporalLeakage({ pipeline, registry, records: [validRecord, validRecord] }),
    /recordIds must be unique/,
  );
});
