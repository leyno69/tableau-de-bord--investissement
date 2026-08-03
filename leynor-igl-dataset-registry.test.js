import test from 'node:test';
import assert from 'node:assert/strict';
import { auditDatasetRegistry, createDatasetRegistry } from './leynor-igl-dataset-registry.js';

function dataset(overrides = {}) {
  return {
    datasetId: 'twelve-data-aapl-daily',
    version: '1.0.0',
    purpose: 'development',
    status: 'registered',
    createdAt: '2026-08-03T04:30:00Z',
    period: { start: '2026-07-01T00:00:00Z', end: '2026-07-31T00:00:00Z' },
    recordCount: 21,
    schemaVersion: 'ohlcv-v1',
    transformationId: 'normalize-twelve-data-v1',
    sourceFingerprints: ['sha256:source-a'],
    pointInTimeVerified: false,
    licenceVerified: false,
    survivorshipBiasAudited: false,
    revisionsAudited: false,
    ...overrides,
  };
}

test('creates a deterministic immutable registry', () => {
  const input = {
    registryId: 'igl-datasets',
    version: '1.0.0',
    createdAt: '2026-08-03T04:31:00Z',
    datasets: [dataset()],
  };
  const first = createDatasetRegistry(input);
  const second = createDatasetRegistry(input);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.datasets[0]), true);
  assert.equal(first.readyForExternalValidation, false);
  assert.equal(first.readyForProduction, false);
});

test('sorts datasets and source fingerprints deterministically', () => {
  const registry = createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z',
    datasets: [
      dataset({ datasetId: 'z', sourceFingerprints: ['sha256:b', 'sha256:a'] }),
      dataset({ datasetId: 'a', version: '2' }),
    ],
  });
  assert.deepEqual(registry.datasets.map((item) => item.datasetId), ['a', 'z']);
  assert.deepEqual(registry.datasets[1].sourceFingerprints, ['sha256:a', 'sha256:b']);
});

test('rejects duplicate dataset versions', () => {
  assert.throws(() => createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z',
    datasets: [dataset(), dataset()],
  }), /unique/);
});

test('rejects invalid periods and duplicate source fingerprints', () => {
  assert.throws(() => createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z',
    datasets: [dataset({ period: { start: '2026-08-02', end: '2026-08-01' } })],
  }), /period.start/);
  assert.throws(() => createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z',
    datasets: [dataset({ sourceFingerprints: ['sha256:a', 'sha256:a'] })],
  }), /unique/);
});

test('audits every scientific blocker', () => {
  const registry = createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z', datasets: [dataset()],
  });
  const audit = auditDatasetRegistry(registry);
  assert.equal(audit.blockerCount, 5);
  assert.equal(audit.eligibleForExternalValidation, false);
  assert.equal(audit.readyForExternalValidation, false);
  assert.equal(audit.readyForProduction, false);
});

test('eligibility does not activate validation or production flags', () => {
  const registry = createDatasetRegistry({
    registryId: 'igl-datasets', version: '1', createdAt: '2026-08-03T04:31:00Z',
    datasets: [dataset({
      status: 'frozen', pointInTimeVerified: true, licenceVerified: true,
      survivorshipBiasAudited: true, revisionsAudited: true,
    })],
  });
  const audit = auditDatasetRegistry(registry);
  assert.equal(audit.eligibleForExternalValidation, true);
  assert.equal(audit.readyForExternalValidation, false);
  assert.equal(audit.readyForProduction, false);
});
