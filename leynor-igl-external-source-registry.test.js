import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditExternalSourceRegistry,
  createExternalSourceRegistry,
} from './leynor-igl-external-source-registry.js';

const eligibleSource = {
  sourceId: 'market-prices-pit-001',
  name: 'Historical market prices point-in-time archive',
  provider: 'Example licensed provider',
  provenance: 'Vendor archive acquired under research licence; no observations bundled in the repository.',
  frequency: 'daily',
  fingerprint: `sha256:${'a'.repeat(64)}`,
  fingerprintedAt: '2026-08-02',
  license: {
    name: 'Research data licence',
    url: 'https://example.invalid/licence',
    permitsResearchUse: true,
    permitsRedistribution: false,
    restrictions: ['no-raw-data-redistribution'],
    verifiedAt: '2026-08-02',
  },
  availability: {
    mode: 'native-point-in-time',
    firstAvailableDate: '2000-01-03',
    publicationLagDocumented: true,
    publicationLagDescription: 'End-of-day observations are released after market close.',
    asOfField: 'observation_date',
    releasedAtField: 'released_at',
    archiveLocation: 'licensed-provider-archive',
  },
  survivorshipBias: {
    risk: 'low',
    includesDelistedEntities: true,
    methodology: 'Historical membership and delisted instruments are retained.',
  },
  corrections: {
    policy: 'versioned-revisions',
    revisionsAvailable: true,
    revisionField: 'revision_id',
    auditTrailLocation: 'licensed-provider-revision-log',
  },
  fields: ['instrument_id', 'observation_date', 'released_at', 'close'],
  notes: ['metadata-only-test-fixture'],
};

const baseInput = {
  registryId: 'igl-external-sources-001',
  version: '1.0.0',
  createdAt: '2026-08-02',
  sources: [eligibleSource],
};

test('crée un registre déterministe, immuable et non productif', () => {
  const registry = createExternalSourceRegistry(baseInput);
  assert.equal(registry.status, 'registered-not-approved');
  assert.equal(registry.externalValidationExecuted, false);
  assert.equal(registry.productionScoreAllowed, false);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.sources[0].license), true);
  assert.deepEqual(registry, createExternalSourceRegistry(baseInput));
});

test('enregistre provenance, licence, fréquence, disponibilité, empreinte, biais et corrections', () => {
  const registry = createExternalSourceRegistry(baseInput);
  const [source] = registry.sources;
  assert.equal(source.provenance, eligibleSource.provenance);
  assert.equal(source.license.permitsResearchUse, true);
  assert.equal(source.frequency, 'daily');
  assert.equal(source.availability.mode, 'native-point-in-time');
  assert.equal(source.fingerprint, eligibleSource.fingerprint);
  assert.equal(source.survivorshipBias.includesDelistedEntities, true);
  assert.equal(source.corrections.policy, 'versioned-revisions');
});

test('refuse les empreintes non cryptographiques', () => {
  const invalid = structuredClone(baseInput);
  invalid.sources[0].fingerprint = 'not-a-sha256';
  assert.throws(
    () => createExternalSourceRegistry(invalid),
    /sha256 fingerprint/,
  );
});

test('refuse les identifiants et empreintes dupliqués', () => {
  const duplicateId = structuredClone(baseInput);
  duplicateId.sources.push({
    ...structuredClone(eligibleSource),
    fingerprint: `sha256:${'b'.repeat(64)}`,
  });
  assert.throws(() => createExternalSourceRegistry(duplicateId), /sourceIds must be unique/);

  const duplicateFingerprint = structuredClone(baseInput);
  duplicateFingerprint.sources.push({
    ...structuredClone(eligibleSource),
    sourceId: 'second-source',
  });
  assert.throws(
    () => createExternalSourceRegistry(duplicateFingerprint),
    /fingerprints must be unique/,
  );
});

test('bloque une source sans disponibilité point-in-time réelle', () => {
  const input = structuredClone(baseInput);
  input.sources[0].availability.mode = 'current-snapshot-only';
  const audit = auditExternalSourceRegistry(createExternalSourceRegistry(input));
  assert.equal(audit.readyForTemporalPipeline, false);
  assert.ok(audit.sourceAudits[0].blockers.includes('current-snapshot-only'));
});

test('bloque une licence qui ne permet pas la recherche', () => {
  const input = structuredClone(baseInput);
  input.sources[0].license.permitsResearchUse = false;
  const audit = auditExternalSourceRegistry(createExternalSourceRegistry(input));
  assert.equal(audit.readyForTemporalPipeline, false);
  assert.ok(audit.sourceAudits[0].blockers.includes('research-use-not-permitted'));
});

test('bloque les corrections historiques non auditables', () => {
  const input = structuredClone(baseInput);
  input.sources[0].corrections.policy = 'overwrite-without-history';
  input.sources[0].corrections.revisionsAvailable = false;
  input.sources[0].corrections.revisionField = null;
  const audit = auditExternalSourceRegistry(createExternalSourceRegistry(input));
  assert.equal(audit.readyForTemporalPipeline, false);
  assert.ok(audit.sourceAudits[0].blockers.includes('historical-corrections-not-auditable'));
});

test('autorise uniquement le passage au pipeline anti-fuite', () => {
  const audit = auditExternalSourceRegistry(createExternalSourceRegistry(baseInput));
  assert.equal(audit.readyForTemporalPipeline, true);
  assert.equal(audit.readyForExternalValidation, false);
  assert.equal(audit.readyForProduction, false);
  assert.deepEqual(audit.sourceAudits[0].blockers, []);
  assert.match(audit.nextStep, /anti-temporal-leakage pipeline/);
});
