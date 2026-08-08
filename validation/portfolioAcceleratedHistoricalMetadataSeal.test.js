import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAcceleratedHistoricalProtocol
} from './portfolioAcceleratedHistoricalCampaign.js';
import {
  createAcceleratedHistoricalDependenceMethod
} from './portfolioAcceleratedHistoricalDependenceAudit.js';
import {
  createLicensedCoverageMetadata,
  createAcceleratedHistoricalMetadataSelectionMethod,
  sealAcceleratedHistoricalMetadata,
  authorizeAcceleratedHistoricalValueOpen,
  verifyAcceleratedHistoricalRawFileFingerprint
} from './portfolioAcceleratedHistoricalMetadataSeal.js';

function protocol() {
  return createAcceleratedHistoricalProtocol({
    campaignId: 'portfolio-probability-accelerated-historical-v1',
    protocolVersion: '1.0.0',
    registeredAt: '2026-08-07T21:12:47Z',
    engineCommit: '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9',
    assumptionsFingerprint: 'a'.repeat(64),
    horizonMonths: 12,
    simulationPathsPerForecast: 5000,
    score: 'brier-score',
    benchmark: 'dynamic-point-in-time-base-rate',
    sourceTrack: 'exact-licensed-eur',
    windowSelectionRule: 'metadata-only-oldest-first-non-overlapping-12-month',
    previouslyInspectedIntervals: [{ evidenceId: 'known-period', startDate: '2014-01-01', endDate: '2023-12-31' }],
    exactLicensedDataRequired: true,
    recalibrationBeforeDecisionForbidden: true,
    developmentFallbackForbidden: true,
    positiveDecisionAuthority: 'retrospective-support-only',
    negativeDecisionAuthority: 'may-reject-after-independent-audit',
    primaryFalsificationRule: 'paired-brier-delta-ci95-lower-above-zero',
    uncertaintyRule: 'dependence-aware-preregistered-method-required'
  });
}

function dependenceMethod(lockedProtocol) {
  return createAcceleratedHistoricalDependenceMethod({
    auditId: 'portfolio-probability-accelerated-historical-dependence-v1',
    campaignId: lockedProtocol.campaignId,
    registeredAt: '2026-08-07T21:29:06Z',
    protocolFingerprint: lockedProtocol.fingerprint,
    statistic: 'mean-paired-brier-loss-delta',
    resamplingMethod: 'circular-moving-block-bootstrap',
    blockLengthRule: 'ceil-n-power-one-fifth',
    blockLengthSensitivityOffsets: [-1, 0, 1],
    confidenceLevel: 0.95,
    intervalType: 'basic-bootstrap-two-sided-envelope',
    bootstrapReplicates: 10000,
    bootstrapSeed: 20260807,
    minimumWindowCount: 12,
    chronologicalOrderRequired: true,
    returnValuesAccessibleAtLock: false,
    positiveDecisionAuthority: 'retrospective-support-only',
    negativeDecisionAuthority: 'may-reject-after-bound-dependence-audit',
    references: ['https://doi.org/10.1214/aos/1176347265', 'https://doi.org/10.1093/biomet/82.3.561']
  });
}

function selectionMethod(lockedProtocol) {
  return createAcceleratedHistoricalMetadataSelectionMethod({
    methodId: 'portfolio-probability-accelerated-metadata-selection-v1',
    methodVersion: '1.0.0',
    registeredAt: '2026-08-07T21:48:59Z',
    protocolFingerprint: lockedProtocol.fingerprint,
    requiredSeriesIds: ['worldProxy', 'paej'],
    commonCoverageRule: 'intersection-of-declared-coverage',
    minimumTrainingMonths: 36,
    horizonMonths: 12,
    strideMonths: 12,
    originAlignmentRule: 'first-full-month-after-common-start-plus-training',
    returnValuesAccessibleAtLock: false,
    amendmentReason: 'figer avant données le minimum de 36 mois déjà appliqué par la campagne de référence'
  });
}

function manifest(seriesId, overrides = {}) {
  return {
    seriesId,
    provider: seriesId === 'worldProxy' ? 'Provider World' : 'Provider PAEJ',
    licenseReference: `license-${seriesId}`,
    indexCode: `index-${seriesId}`,
    returnVariant: 'NETR',
    currency: 'EUR',
    observationInterval: 'daily',
    coverageStart: seriesId === 'worldProxy' ? '2000-01-15' : '2001-03-10',
    coverageEnd: seriesId === 'worldProxy' ? '2026-08-01' : '2025-06-30',
    acquiredAt: '2026-08-07T21:50:00Z',
    pointInTimeStatus: 'licensed-export-acquired-after-preregistration',
    rawFingerprint: (seriesId === 'worldProxy' ? 'a' : 'b').repeat(64),
    normalizedFingerprint: (seriesId === 'worldProxy' ? 'c' : 'd').repeat(64),
    valueFileName: `${seriesId}.csv`,
    valueSchema: 'date,level',
    validationEligible: true,
    returnValuesIncluded: false,
    ...overrides
  };
}

test('normalise un manifeste de couverture sans accepter de valeur incorporée', () => {
  const metadata = createLicensedCoverageMetadata(manifest('worldProxy'));
  assert.equal(metadata.currency, 'EUR');
  assert.equal(metadata.returnValuesIncluded, false);
  assert.match(metadata.fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => createLicensedCoverageMetadata(manifest('worldProxy', { series: [] })), /métadonnées-seulement/);
  assert.throws(() => createLicensedCoverageMetadata(manifest('worldProxy', { hiddenPayload: [100, 101] })), /non autorisés/);
});

test('ne déclenche pas un getter de valeurs lors du rejet du manifeste', () => {
  const input = manifest('worldProxy');
  Object.defineProperty(input, 'series', { enumerable: true, get() { throw new Error('valeurs lues'); } });
  assert.throws(() => createLicensedCoverageMetadata(input), /métadonnées-seulement/);
});

test('fige explicitement les 36 mois d’entraînement avant les valeurs', () => {
  const lockedProtocol = protocol();
  const method = selectionMethod(lockedProtocol);
  assert.equal(method.minimumTrainingMonths, 36);
  assert.equal(method.status, 'selection-method-locked-before-return-values');
  assert.throws(() => createAcceleratedHistoricalMetadataSelectionMethod({ ...method, minimumTrainingMonths: 24 }), /36/);
});

test('scelle la couverture commune, les fenêtres oldest-first et l’audit avant les valeurs', () => {
  const lockedProtocol = protocol();
  const seal = sealAcceleratedHistoricalMetadata({
    protocol: lockedProtocol,
    dependenceMethod: dependenceMethod(lockedProtocol),
    selectionMethod: selectionMethod(lockedProtocol),
    manifests: [manifest('worldProxy'), manifest('paej')],
    sealedAt: '2026-08-07T21:51:00Z',
    returnValuesAccessibleAtSeal: false
  });
  assert.equal(seal.status, 'metadata-sealed-values-unopened');
  assert.deepEqual(seal.commonCoverage, { startDate: '2001-03-10', endDate: '2025-06-30' });
  assert.equal(seal.trainingStart, '2001-04-01');
  assert.equal(seal.windowRegistry.windows[0].originDate, '2004-04-01');
  assert.equal(seal.windowRegistry.windows.at(-1).maturityDate, '2025-04-01');
  assert.equal(seal.windowRegistry.windows.length, 21);
  assert.equal(seal.dependenceAudit.windowCount, 21);
  assert.equal(seal.dependenceAudit.status, 'locked-before-return-values');
  assert.equal(seal.returnValuesAccessibleAtSeal, false);
});

test('refuse le scellement si les valeurs ont été accessibles ou si les couvertures ne se croisent pas', () => {
  const lockedProtocol = protocol();
  const args = {
    protocol: lockedProtocol,
    dependenceMethod: dependenceMethod(lockedProtocol),
    selectionMethod: selectionMethod(lockedProtocol),
    manifests: [manifest('worldProxy'), manifest('paej')],
    sealedAt: '2026-08-07T21:51:00Z'
  };
  assert.throws(() => sealAcceleratedHistoricalMetadata({ ...args, returnValuesAccessibleAtSeal: true }), /précéder tout accès/);
  assert.throws(() => sealAcceleratedHistoricalMetadata({
    ...args,
    manifests: [manifest('worldProxy', { coverageEnd: '2000-12-31' }), manifest('paej')],
    returnValuesAccessibleAtSeal: false
  }), /aucune couverture commune/);
});

test('n’autorise l’ouverture qu’avec l’empreinte du manifeste scellé', () => {
  const lockedProtocol = protocol();
  const world = createLicensedCoverageMetadata(manifest('worldProxy'));
  const seal = sealAcceleratedHistoricalMetadata({
    protocol: lockedProtocol,
    dependenceMethod: dependenceMethod(lockedProtocol),
    selectionMethod: selectionMethod(lockedProtocol),
    manifests: [manifest('worldProxy'), manifest('paej')],
    sealedAt: '2026-08-07T21:51:00Z',
    returnValuesAccessibleAtSeal: false
  });
  const authorization = authorizeAcceleratedHistoricalValueOpen({ seal, seriesId: 'worldProxy', manifestFingerprint: world.fingerprint });
  assert.equal(authorization.valueFileName, 'worldProxy.csv');
  assert.equal(authorization.authorization, 'hash-bytes-before-parsing-and-verify-raw-fingerprint');
  const verified = verifyAcceleratedHistoricalRawFileFingerprint({ authorization, observedRawFingerprint: 'a'.repeat(64) });
  assert.equal(verified.authorization, 'parse-after-raw-fingerprint-match');
  assert.throws(() => verifyAcceleratedHistoricalRawFileFingerprint({ authorization, observedRawFingerprint: 'e'.repeat(64) }), /empreinte brute divergente/);
  assert.throws(() => authorizeAcceleratedHistoricalValueOpen({ seal, seriesId: 'worldProxy', manifestFingerprint: 'f'.repeat(64) }), /divergente/);
});
