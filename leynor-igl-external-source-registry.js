const ALLOWED_FREQUENCIES = Object.freeze([
  'event-driven',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'irregular',
]);

const ALLOWED_AVAILABILITY_MODES = Object.freeze([
  'native-point-in-time',
  'reconstructed-point-in-time',
  'current-snapshot-only',
  'unknown',
]);

const ALLOWED_SURVIVORSHIP_RISK = Object.freeze(['none', 'low', 'medium', 'high', 'unknown']);
const ALLOWED_CORRECTION_POLICIES = Object.freeze([
  'append-only',
  'versioned-revisions',
  'overwrite-with-audit-log',
  'overwrite-without-history',
  'unknown',
]);

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function assertBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
  return value;
}

function assertIsoDate(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${name} must be an ISO date (YYYY-MM-DD)`);
  }
  return normalized;
}

function assertEnum(value, allowed, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!allowed.includes(normalized)) throw new RangeError(`unsupported ${name}: ${normalized}`);
  return normalized;
}

function normalizeOptionalString(value, name) {
  if (value === undefined || value === null) return null;
  return assertNonEmptyString(value, name);
}

function normalizeStringArray(values, name, { allowEmpty = true } = {}) {
  if (!Array.isArray(values)) throw new TypeError(`${name} must be an array`);
  if (!allowEmpty && values.length === 0) throw new TypeError(`${name} must be a non-empty array`);
  const normalized = values.map((value, index) => assertNonEmptyString(value, `${name}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new RangeError(`${name} must not contain duplicates`);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeLicense(license) {
  const input = assertObject(license, 'source.license');
  return {
    name: assertNonEmptyString(input.name, 'source.license.name'),
    url: normalizeOptionalString(input.url, 'source.license.url'),
    permitsResearchUse: assertBoolean(input.permitsResearchUse, 'source.license.permitsResearchUse'),
    permitsRedistribution: assertBoolean(input.permitsRedistribution, 'source.license.permitsRedistribution'),
    restrictions: normalizeStringArray(input.restrictions ?? [], 'source.license.restrictions'),
    verifiedAt: assertIsoDate(input.verifiedAt, 'source.license.verifiedAt'),
  };
}

function normalizeAvailability(availability) {
  const input = assertObject(availability, 'source.availability');
  const mode = assertEnum(input.mode, ALLOWED_AVAILABILITY_MODES, 'source.availability.mode');
  return {
    mode,
    firstAvailableDate: normalizeOptionalString(input.firstAvailableDate, 'source.availability.firstAvailableDate'),
    publicationLagDocumented: assertBoolean(
      input.publicationLagDocumented,
      'source.availability.publicationLagDocumented',
    ),
    publicationLagDescription: normalizeOptionalString(
      input.publicationLagDescription,
      'source.availability.publicationLagDescription',
    ),
    asOfField: normalizeOptionalString(input.asOfField, 'source.availability.asOfField'),
    releasedAtField: normalizeOptionalString(input.releasedAtField, 'source.availability.releasedAtField'),
    archiveLocation: normalizeOptionalString(input.archiveLocation, 'source.availability.archiveLocation'),
  };
}

function normalizeSurvivorshipBias(survivorshipBias) {
  const input = assertObject(survivorshipBias, 'source.survivorshipBias');
  return {
    risk: assertEnum(input.risk, ALLOWED_SURVIVORSHIP_RISK, 'source.survivorshipBias.risk'),
    includesDelistedEntities: assertBoolean(
      input.includesDelistedEntities,
      'source.survivorshipBias.includesDelistedEntities',
    ),
    methodology: normalizeOptionalString(input.methodology, 'source.survivorshipBias.methodology'),
  };
}

function normalizeCorrections(corrections) {
  const input = assertObject(corrections, 'source.corrections');
  return {
    policy: assertEnum(input.policy, ALLOWED_CORRECTION_POLICIES, 'source.corrections.policy'),
    revisionsAvailable: assertBoolean(input.revisionsAvailable, 'source.corrections.revisionsAvailable'),
    revisionField: normalizeOptionalString(input.revisionField, 'source.corrections.revisionField'),
    auditTrailLocation: normalizeOptionalString(
      input.auditTrailLocation,
      'source.corrections.auditTrailLocation',
    ),
  };
}

function normalizeSource(source) {
  const input = assertObject(source, 'source');
  const fingerprint = assertNonEmptyString(input.fingerprint, 'source.fingerprint');
  if (!/^sha256:[a-f0-9]{64}$/i.test(fingerprint)) {
    throw new TypeError('source.fingerprint must be a sha256 fingerprint');
  }

  return {
    sourceId: assertNonEmptyString(input.sourceId, 'source.sourceId'),
    name: assertNonEmptyString(input.name, 'source.name'),
    provider: assertNonEmptyString(input.provider, 'source.provider'),
    provenance: assertNonEmptyString(input.provenance, 'source.provenance'),
    frequency: assertEnum(input.frequency, ALLOWED_FREQUENCIES, 'source.frequency'),
    fingerprint: fingerprint.toLowerCase(),
    fingerprintedAt: assertIsoDate(input.fingerprintedAt, 'source.fingerprintedAt'),
    license: normalizeLicense(input.license),
    availability: normalizeAvailability(input.availability),
    survivorshipBias: normalizeSurvivorshipBias(input.survivorshipBias),
    corrections: normalizeCorrections(input.corrections),
    fields: normalizeStringArray(input.fields, 'source.fields', { allowEmpty: false }),
    notes: normalizeStringArray(input.notes ?? [], 'source.notes'),
  };
}

export function createExternalSourceRegistry(input) {
  const registryInput = assertObject(input, 'input');
  const sources = (registryInput.sources ?? []).map(normalizeSource);
  if (sources.length === 0) throw new TypeError('input.sources must be a non-empty array');

  const sourceIds = sources.map((source) => source.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) throw new RangeError('sourceIds must be unique');

  const fingerprints = sources.map((source) => source.fingerprint);
  if (new Set(fingerprints).size !== fingerprints.length) {
    throw new RangeError('source fingerprints must be unique');
  }

  return deepFreeze({
    registryId: assertNonEmptyString(registryInput.registryId, 'input.registryId'),
    version: assertNonEmptyString(registryInput.version, 'input.version'),
    createdAt: assertIsoDate(registryInput.createdAt, 'input.createdAt'),
    sources: sources.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    status: 'registered-not-approved',
    externalValidationExecuted: false,
    productionScoreAllowed: false,
    notice: 'This registry records source metadata only. It does not prove data quality, execute external validation, or authorize a production IGL score.',
  });
}

function sourceBlockers(source) {
  const blockers = [];
  if (!source.license.permitsResearchUse) blockers.push('research-use-not-permitted');
  if (source.availability.mode === 'unknown') blockers.push('point-in-time-availability-unknown');
  if (source.availability.mode === 'current-snapshot-only') blockers.push('current-snapshot-only');
  if (!source.availability.publicationLagDocumented) blockers.push('publication-lag-undocumented');
  if (!source.availability.releasedAtField) blockers.push('released-at-field-missing');
  if (source.survivorshipBias.risk === 'unknown') blockers.push('survivorship-bias-unknown');
  if (
    source.survivorshipBias.risk !== 'none'
    && !source.survivorshipBias.includesDelistedEntities
    && !source.survivorshipBias.methodology
  ) {
    blockers.push('survivorship-bias-mitigation-missing');
  }
  if (source.corrections.policy === 'unknown') blockers.push('correction-policy-unknown');
  if (source.corrections.policy === 'overwrite-without-history') blockers.push('historical-corrections-not-auditable');
  if (source.corrections.revisionsAvailable && !source.corrections.revisionField) {
    blockers.push('revision-field-missing');
  }
  return blockers;
}

export function auditExternalSourceRegistry(registry) {
  const input = assertObject(registry, 'registry');
  if (!Array.isArray(input.sources)) throw new TypeError('registry.sources must be an array');

  const sourceAudits = input.sources.map((source) => {
    const blockers = sourceBlockers(source);
    return {
      sourceId: source.sourceId,
      eligibleForTemporalPipeline: blockers.length === 0,
      blockers,
    };
  });

  const blockerCount = sourceAudits.reduce((sum, source) => sum + source.blockers.length, 0);
  return deepFreeze({
    sourceCount: sourceAudits.length,
    eligibleSourceCount: sourceAudits.filter((source) => source.eligibleForTemporalPipeline).length,
    blockerCount,
    readyForTemporalPipeline: sourceAudits.length > 0 && blockerCount === 0,
    readyForExternalValidation: false,
    readyForProduction: false,
    sourceAudits,
    nextStep: blockerCount === 0
      ? 'Run the anti-temporal-leakage pipeline before creating development, validation, or locked-test datasets.'
      : 'Resolve source provenance, licence, point-in-time availability, survivorship-bias, and correction-history blockers.',
  });
}

export const EXTERNAL_SOURCE_REGISTRY_CONSTANTS = deepFreeze({
  frequencies: [...ALLOWED_FREQUENCIES],
  availabilityModes: [...ALLOWED_AVAILABILITY_MODES],
  survivorshipRiskLevels: [...ALLOWED_SURVIVORSHIP_RISK],
  correctionPolicies: [...ALLOWED_CORRECTION_POLICIES],
});
