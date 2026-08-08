import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLicensedCoverageMetadata } from '../../validation/portfolioAcceleratedHistoricalMetadataSeal.js';
import { createAcceleratedHistoricalValueGateMethod } from '../../validation/portfolioAcceleratedHistoricalValueGate.js';
import {
  METADATA_SEAL_ARTIFACT_PATH,
  LICENSED_MANIFEST_PATHS,
  LICENSED_VALUE_PATHS,
  loadAcceleratedHistoricalLicensedInputs,
  buildAcceleratedHistoricalLicensedInputEvidence
} from './verify-licensed-inputs.mjs';

const CSV = Object.freeze({
  paej: 'date,level\n2020-01-02,100\n2020-01-03,101\n',
  worldProxy: 'date,level\n2020-01-02,200\n2020-01-03,202\n'
});
const PROTOCOL_FINGERPRINT = 'e'.repeat(64);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function manifest(seriesId) {
  return {
    seriesId,
    provider: `provider-${seriesId}`,
    licenseReference: `license-${seriesId}`,
    indexCode: `index-${seriesId}`,
    returnVariant: 'NETR',
    currency: 'EUR',
    observationInterval: 'daily',
    coverageStart: '2020-01-02',
    coverageEnd: '2020-01-03',
    acquiredAt: '2026-08-07T21:50:00Z',
    pointInTimeStatus: 'licensed-export-acquired-after-preregistration',
    rawFingerprint: sha256(Buffer.from(CSV[seriesId], 'utf8')),
    normalizedFingerprint: sha256(Buffer.from(CSV[seriesId], 'utf8')),
    valueFileName: `${seriesId}.csv`,
    valueSchema: 'date,level',
    validationEligible: true,
    returnValuesIncluded: false
  };
}

function sealArtifact(manifestInputs) {
  const normalized = manifestInputs.map(createLicensedCoverageMetadata).sort((left, right) => left.seriesId.localeCompare(right.seriesId));
  return {
    licensedInputGateMethod: createAcceleratedHistoricalValueGateMethod({
      registeredAt: '2026-08-07T21:50:30Z',
      protocolFingerprint: PROTOCOL_FINGERPRINT,
      returnValuesAccessibleAtLock: false
    }),
    metadataSeal: {
      status: 'metadata-sealed-values-unopened',
      campaignId: 'portfolio-probability-accelerated-historical-v1',
      sealedAt: '2026-08-07T21:51:00Z',
      returnValuesAccessibleAtSeal: false,
      protocolFingerprint: PROTOCOL_FINGERPRINT,
      fingerprint: 'f'.repeat(64),
      manifestBindings: normalized.map(item => ({
        seriesId: item.seriesId,
        manifestFingerprint: item.fingerprint,
        expectedRawFingerprint: item.rawFingerprint,
        expectedNormalizedFingerprint: item.normalizedFingerprint,
        valueFileName: item.valueFileName
      }))
    }
  };
}

function fixtureFiles(manifestInputs = [manifest('paej'), manifest('worldProxy')]) {
  return new Map([
    [METADATA_SEAL_ARTIFACT_PATH, JSON.stringify(sealArtifact(manifestInputs))],
    [LICENSED_MANIFEST_PATHS.paej, JSON.stringify(manifestInputs.find(item => item.seriesId === 'paej'))],
    [LICENSED_MANIFEST_PATHS.worldProxy, JSON.stringify(manifestInputs.find(item => item.seriesId === 'worldProxy'))],
    [LICENSED_VALUE_PATHS.paej, Buffer.from(CSV.paej, 'utf8')],
    [LICENSED_VALUE_PATHS.worldProxy, Buffer.from(CSV.worldProxy, 'utf8')]
  ]);
}

test('lit le scellement et les deux manifestes avant le premier octet de valeurs', async () => {
  const requested = [];
  const files = fixtureFiles();
  const loaded = await loadAcceleratedHistoricalLicensedInputs({
    async readData(path, encoding) {
      requested.push({ path, encoding: encoding ?? null });
      return files.get(path);
    }
  });
  assert.deepEqual(requested.map(item => item.path), [
    METADATA_SEAL_ARTIFACT_PATH,
    LICENSED_MANIFEST_PATHS.paej,
    LICENSED_MANIFEST_PATHS.worldProxy,
    LICENSED_VALUE_PATHS.paej,
    LICENSED_VALUE_PATHS.worldProxy
  ]);
  assert.deepEqual(requested.map(item => item.encoding), ['utf8', 'utf8', 'utf8', null, null]);
  assert.equal(loaded.preparedOpen.status, 'raw-byte-hashing-authorized-values-unparsed');
});

test('un manifeste divergent bloque avant toute lecture des CSV', async () => {
  const manifestInputs = [manifest('paej'), manifest('worldProxy')];
  const files = fixtureFiles(manifestInputs);
  files.set(LICENSED_MANIFEST_PATHS.paej, JSON.stringify({ ...manifestInputs[0], licenseReference: 'changed-after-seal' }));
  const requested = [];
  await assert.rejects(() => loadAcceleratedHistoricalLicensedInputs({
    async readData(path) {
      requested.push(path);
      return files.get(path);
    }
  }), /manifeste divergente/);
  assert.equal(requested.some(path => path.endsWith('.csv')), false);
});

test('l’artefact de preuve exclut les valeurs et ne lance aucune analyse', async () => {
  const files = fixtureFiles();
  const loaded = await loadAcceleratedHistoricalLicensedInputs({
    async readData(path) {
      return files.get(path);
    }
  });
  const artifact = buildAcceleratedHistoricalLicensedInputEvidence({
    ...loaded,
    verifiedAt: '2026-08-07T22:10:00Z'
  });
  assert.equal(artifact.inputEvidence.status, 'licensed-input-set-verified-before-analysis');
  assert.equal(artifact.valuesPersistedInArtifact, false);
  assert.equal(artifact.analysisStarted, false);
  assert.equal(artifact.results.length, 0);
  assert.equal(artifact.engineModified, false);
  assert.equal(JSON.stringify(artifact).includes('2020-01-03,101'), false);
});
