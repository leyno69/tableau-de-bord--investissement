import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutionArtifacts,
  checksum,
  validateExecutionArtifacts,
} from './leynor-lab-factorial-execution-artifacts.js';

const config = Object.freeze({
  campaignId: 'artifact-test',
  behaviors: ['regular', 'interruption'],
  reserveMonths: [0, 6],
  lineCounts: [5],
  assetVolatilities: [0.12],
  correlations: [0.1, 0.75],
  shockIntensities: [0, 7200],
  horizons: [10, 30],
  seeds: [101, 202, 303, 404, 505],
  pathsPerReplication: 2,
  assumptions: {
    initialCapital: 10000,
    monthlyContribution: 300,
    annualGeometricReturn: 0.05,
  },
  limitations: ['synthetic'],
});

test('génère des artefacts reproductibles et vérifiables', () => {
  const metadata = { generatedAt: '2026-08-02T00:00:00Z', engineCommit: 'abc123' };
  const first = buildExecutionArtifacts(config, metadata);
  const second = buildExecutionArtifacts(config, metadata);

  assert.deepEqual(first, second);
  assert.equal(first.manifest.replicationCount, 160);
  assert.equal(first.manifest.totalPaths, 320);
  assert.equal(first.manifest.cellCount, 32);
  assert.equal(validateExecutionArtifacts(first, config).valid, true);
});

test('détecte une altération des observations', () => {
  const artifacts = buildExecutionArtifacts(config);
  const tampered = {
    ...artifacts,
    observations: artifacts.observations.map((row, index) => index === 0 ? { ...row, finalMedian: row.finalMedian + 1 } : row),
  };
  const validation = validateExecutionArtifacts(tampered, config);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('observations checksum mismatch'));
});

test('le checksum ne dépend pas de l’ordre des clés', () => {
  assert.equal(checksum({ a: 1, b: 2 }), checksum({ b: 2, a: 1 }));
});
