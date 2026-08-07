import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseLicensedBenchmarkCsv } from './licensedBenchmarkCsv.js';
import { createLicensedCoverageMetadata } from './portfolioAcceleratedHistoricalMetadataSeal.js';
import {
  serializeAcceleratedHistoricalNormalizedSeries,
  fingerprintAcceleratedHistoricalNormalizedSeries,
  createAcceleratedHistoricalValueGateMethod,
  prepareAcceleratedHistoricalValueOpen,
  verifyAndOpenAcceleratedHistoricalValueSet
} from './portfolioAcceleratedHistoricalValueGate.js';

const CSV = Object.freeze({
  paej: 'date,level\r\n2020-01-02,100.00\r\n2020-01-03,101.500\r\n',
  worldProxy: 'date,level\n2020-01-02,200\n2020-01-03,198.25\n'
});

const NORMALIZED = Object.freeze({
  paej: 'date,level\n2020-01-02,100\n2020-01-03,101.5\n',
  worldProxy: 'date,level\n2020-01-02,200\n2020-01-03,198.25\n'
});
const PROTOCOL_FINGERPRINT = 'e'.repeat(64);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function manifest(seriesId, overrides = {}) {
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
    normalizedFingerprint: sha256(Buffer.from(NORMALIZED[seriesId], 'utf8')),
    valueFileName: `${seriesId}.csv`,
    valueSchema: 'date,level',
    validationEligible: true,
    returnValuesIncluded: false,
    ...overrides
  };
}

function metadataSeal(manifestInputs) {
  const normalized = manifestInputs.map(createLicensedCoverageMetadata).sort((left, right) => left.seriesId.localeCompare(right.seriesId));
  return Object.freeze({
    status: 'metadata-sealed-values-unopened',
    campaignId: 'portfolio-probability-accelerated-historical-v1',
    sealedAt: '2026-08-07T21:51:00Z',
    returnValuesAccessibleAtSeal: false,
    protocolFingerprint: PROTOCOL_FINGERPRINT,
    fingerprint: 'f'.repeat(64),
    manifestBindings: Object.freeze(normalized.map(item => Object.freeze({
      seriesId: item.seriesId,
      manifestFingerprint: item.fingerprint,
      expectedRawFingerprint: item.rawFingerprint,
      expectedNormalizedFingerprint: item.normalizedFingerprint,
      valueFileName: item.valueFileName
    })))
  });
}

function valueGateMethod() {
  return createAcceleratedHistoricalValueGateMethod({
    registeredAt: '2026-08-07T21:50:30Z',
    protocolFingerprint: PROTOCOL_FINGERPRINT,
    returnValuesAccessibleAtLock: false
  });
}

function prepared(manifestInputs = [manifest('paej'), manifest('worldProxy')]) {
  return prepareAcceleratedHistoricalValueOpen({ seal: metadataSeal(manifestInputs), manifestInputs, valueGateMethod: valueGateMethod() });
}

function rawFiles(overrides = {}) {
  return {
    paej: Buffer.from(CSV.paej, 'utf8'),
    worldProxy: Buffer.from(CSV.worldProxy, 'utf8'),
    ...overrides
  };
}

test('fige une sérialisation normalisée indépendante des fins de ligne et zéros décimaux', () => {
  const parsed = parseLicensedBenchmarkCsv(CSV.paej, manifest('paej'));
  assert.equal(serializeAcceleratedHistoricalNormalizedSeries(parsed.series), NORMALIZED.paej);
  assert.equal(fingerprintAcceleratedHistoricalNormalizedSeries(parsed.series), sha256(Buffer.from(NORMALIZED.paej, 'utf8')));
});

test('verrouille la méthode complète du sas avant les valeurs', () => {
  const method = valueGateMethod();
  assert.equal(method.status, 'value-gate-method-locked-before-return-values');
  assert.equal(method.rawSetVerificationRule, 'verify-both-before-any-parsing');
  assert.equal(method.normalizedSerialization, 'utf8-csv-date-level-lf-final-newline-numeric-string-v1');
  assert.equal(method.returnValuesAccessibleAtLock, false);
  assert.throws(() => createAcceleratedHistoricalValueGateMethod({
    registeredAt: '2026-08-07T21:50:30Z',
    protocolFingerprint: PROTOCOL_FINGERPRINT,
    returnValuesAccessibleAtLock: true
  }), /avant accès aux valeurs/);
});

test('autorise le hachage seulement après concordance des manifestes scellés', () => {
  const input = [manifest('paej'), manifest('worldProxy')];
  const authorization = prepareAcceleratedHistoricalValueOpen({ seal: metadataSeal(input), manifestInputs: input, valueGateMethod: valueGateMethod() });
  assert.equal(authorization.status, 'raw-byte-hashing-authorized-values-unparsed');
  assert.equal(authorization.rawValueBytesAccessibleAtPreparation, false);
  assert.deepEqual(authorization.manifests.map(item => item.seriesId), ['paej', 'worldProxy']);
  assert.equal(Object.isFrozen(authorization.authorizations), true);
  assert.throws(() => prepareAcceleratedHistoricalValueOpen({
    seal: metadataSeal(input),
    manifestInputs: [manifest('paej', { licenseReference: 'changed' }), manifest('worldProxy')],
    valueGateMethod: valueGateMethod()
  }), /manifeste divergente/);
});

test('vérifie les deux empreintes brutes avant le premier parsing', () => {
  let parseCalls = 0;
  assert.throws(() => verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepared(),
    rawFilesBySeries: rawFiles({ worldProxy: Buffer.from(`${CSV.worldProxy}2020-01-06,199\n`, 'utf8') }),
    verifiedAt: '2026-08-07T22:10:00Z',
    parseCsv(...args) {
      parseCalls += 1;
      return parseLicensedBenchmarkCsv(...args);
    }
  }), /empreinte brute divergente/);
  assert.equal(parseCalls, 0);
});

test('ouvre atomiquement les deux séries et ne place aucune valeur dans la preuve', () => {
  const first = verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepared(),
    rawFilesBySeries: rawFiles(),
    verifiedAt: '2026-08-07T22:10:00Z'
  });
  const second = verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepared(),
    rawFilesBySeries: rawFiles(),
    verifiedAt: '2026-08-07T22:10:00Z'
  });
  assert.deepEqual(first, second);
  assert.equal(first.evidence.status, 'licensed-input-set-verified-before-analysis');
  assert.equal(first.evidence.rawFingerprintsVerifiedBeforeAnyParsing, true);
  assert.equal(first.evidence.normalizedFingerprintsVerifiedBeforeAnalysis, true);
  assert.equal(first.evidence.valuesEmbeddedInEvidence, false);
  assert.deepEqual(first.evidence.seriesEvidence.map(item => item.observationCount), [2, 2]);
  assert.equal(first.datasetsBySeries.paej.series[1].price, 101.5);
  assert.equal(JSON.stringify(first.evidence).includes('101.5'), false);
});

test('refuse une empreinte normalisée ou une couverture divergente après le contrôle brut', () => {
  const wrongNormalized = [manifest('paej', { normalizedFingerprint: '0'.repeat(64) }), manifest('worldProxy')];
  assert.throws(() => verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepareAcceleratedHistoricalValueOpen({ seal: metadataSeal(wrongNormalized), manifestInputs: wrongNormalized, valueGateMethod: valueGateMethod() }),
    rawFilesBySeries: rawFiles(),
    verifiedAt: '2026-08-07T22:10:00Z'
  }), /empreinte normalisée divergente/);

  const wrongCoverage = [manifest('paej', { coverageStart: '2020-01-01' }), manifest('worldProxy')];
  assert.throws(() => verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepareAcceleratedHistoricalValueOpen({ seal: metadataSeal(wrongCoverage), manifestInputs: wrongCoverage, valueGateMethod: valueGateMethod() }),
    rawFilesBySeries: rawFiles(),
    verifiedAt: '2026-08-07T22:10:00Z'
  }), /couverture observée divergente/);
});

test('refuse une vérification antérieure au scellement ou un ensemble de fichiers incomplet', () => {
  assert.throws(() => verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepared(),
    rawFilesBySeries: rawFiles(),
    verifiedAt: '2026-08-07T21:50:59Z'
  }), /ne peut pas précéder/);
  assert.throws(() => verifyAndOpenAcceleratedHistoricalValueSet({
    preparedOpen: prepared(),
    rawFilesBySeries: { paej: Buffer.from(CSV.paej, 'utf8') },
    verifiedAt: '2026-08-07T22:10:00Z'
  }), /exactement paej et worldProxy/);
});
