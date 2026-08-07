import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COVERAGE_MANIFEST_PATHS,
  loadAcceleratedHistoricalCoverageManifests,
  buildAcceleratedHistoricalMetadataSeal
} from './seal-metadata.mjs';

function manifest(seriesId) {
  return {
    seriesId,
    provider: `provider-${seriesId}`,
    licenseReference: `license-${seriesId}`,
    indexCode: `index-${seriesId}`,
    returnVariant: 'NETR',
    currency: 'EUR',
    observationInterval: 'daily',
    coverageStart: '2000-01-01',
    coverageEnd: '2025-12-31',
    acquiredAt: '2026-08-07T21:50:00Z',
    pointInTimeStatus: 'licensed-export-acquired-after-preregistration',
    rawFingerprint: (seriesId === 'paej' ? 'a' : 'b').repeat(64),
    normalizedFingerprint: (seriesId === 'paej' ? 'c' : 'd').repeat(64),
    valueFileName: `${seriesId}.csv`,
    valueSchema: 'date,level',
    validationEligible: true,
    returnValuesIncluded: false
  };
}

test('le chargeur ne demande que les deux manifestes JSON et aucun CSV', async () => {
  const requested = [];
  const contents = new Map([
    [COVERAGE_MANIFEST_PATHS[0], JSON.stringify(manifest('paej'))],
    [COVERAGE_MANIFEST_PATHS[1], JSON.stringify(manifest('worldProxy'))]
  ]);
  const manifests = await loadAcceleratedHistoricalCoverageManifests({
    readText: async path => {
      requested.push(path);
      return contents.get(path);
    }
  });
  assert.deepEqual(requested, COVERAGE_MANIFEST_PATHS);
  assert.equal(requested.some(path => path.endsWith('.csv')), false);
  assert.equal(manifests.length, 2);
});

test('produit un scellement reproductible sans résultat et sans modifier le moteur', () => {
  const input = {
    manifestInputs: [manifest('paej'), manifest('worldProxy')],
    sealedAt: '2026-08-07T22:16:00Z',
    returnValuesAccessibleAtSeal: false
  };
  const first = buildAcceleratedHistoricalMetadataSeal(input);
  const second = buildAcceleratedHistoricalMetadataSeal(input);
  assert.deepEqual(first, second);
  assert.equal(first.metadataSeal.status, 'metadata-sealed-values-unopened');
  assert.equal(first.licensedInputGateMethod.status, 'value-gate-method-locked-before-return-values');
  assert.equal(first.licensedInputGateMethod.registeredAt, '2026-08-07T22:15:01Z');
  assert.ok(first.metadataSeal.windowRegistry.windows.length >= 12);
  assert.equal(first.results.length, 0);
  assert.equal(first.engineModified, false);
  assert.throws(() => buildAcceleratedHistoricalMetadataSeal({ ...input, sealedAt: '2026-08-07T22:15:00Z' }), /verrouillage du sas/);
});
