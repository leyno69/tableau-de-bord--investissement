import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoricalDatasetManifest, assertDatasetManifestMatchesTrack } from './portfolioHistoricalDatasetManifest.js';

const fixtureInput = {
  datasetId: 'fixture-wpea-proxy-v1',
  usage: 'fixture',
  providerId: 'local-fixture',
  licenseReference: 'test-fixture-only',
  sourceSymbol: 'MSCI-WORLD-FIXTURE',
  normalizedInstrumentId: 'msci-world-net-tr-eur',
  track: 'proxy',
  interval: '1day',
  start: '2020-01-01',
  end: '2020-01-03',
  acquiredAt: '2026-08-07T00:00:00Z',
  timezone: 'UTC',
  currency: 'EUR',
  returnBasis: 'net-total-return',
  corporateActionPolicy: 'not-applicable-index-fixture',
  missingDataPolicy: 'reject',
  pointInTimeStatus: 'fixture-only',
  rawFingerprint: 'a'.repeat(64),
  normalizedFingerprint: 'b'.repeat(64),
  validationEligibleSource: false
};

test('un manifeste fixture est déterministe', () => {
  const first = createHistoricalDatasetManifest(fixtureInput);
  const second = createHistoricalDatasetManifest({ ...fixtureInput });
  assert.equal(first.manifestFingerprint, second.manifestFingerprint);
  assert.equal(Object.isFrozen(first), true);
});

test('une validation empirique refuse une source non éligible', () => {
  assert.throws(() => createHistoricalDatasetManifest({ ...fixtureInput, usage: 'empirical-validation' }), /validation-eligible/);
});

test('le track exact/proxy est vérifié explicitement', () => {
  const manifest = createHistoricalDatasetManifest(fixtureInput);
  assert.equal(assertDatasetManifestMatchesTrack(manifest, 'proxy'), true);
  assert.throws(() => assertDatasetManifestMatchesTrack(manifest, 'exact'), /track attendu/);
});

test('une période inversée est rejetée', () => {
  assert.throws(() => createHistoricalDatasetManifest({ ...fixtureInput, start: '2020-02-01', end: '2020-01-01' }), /end/);
});
