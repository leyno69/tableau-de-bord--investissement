const ALLOWED_TIMESTAMP_PRECISIONS = Object.freeze(['date', 'datetime']);
const ALLOWED_REVISION_MODES = Object.freeze(['first-release', 'as-revised', 'latest-known']);

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
  return value;
}

function assertEnum(value, allowed, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!allowed.includes(normalized)) throw new RangeError(`unsupported ${name}: ${normalized}`);
  return normalized;
}

function assertTimestamp(value, name, precision) {
  const normalized = assertNonEmptyString(value, name);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
  const validDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(normalized);
  if ((precision === 'date' && !validDate) || (precision === 'datetime' && !validDateTime)) {
    throw new TypeError(`${name} must match ${precision} precision`);
  }
  if (Number.isNaN(Date.parse(validDate ? `${normalized}T00:00:00Z` : normalized))) {
    throw new TypeError(`${name} must be a valid timestamp`);
  }
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeRecord(record, index, config) {
  const input = assertObject(record, `records[${index}]`);
  const observedAt = assertTimestamp(input.observedAt, `records[${index}].observedAt`, config.timestampPrecision);
  const releasedAt = assertTimestamp(input.releasedAt, `records[${index}].releasedAt`, config.timestampPrecision);
  const ingestedAt = assertTimestamp(input.ingestedAt, `records[${index}].ingestedAt`, config.timestampPrecision);
  const revisionNumber = Number(input.revisionNumber ?? 0);
  if (!Number.isInteger(revisionNumber) || revisionNumber < 0) {
    throw new TypeError(`records[${index}].revisionNumber must be a non-negative integer`);
  }

  return {
    recordId: assertNonEmptyString(input.recordId, `records[${index}].recordId`),
    sourceId: assertNonEmptyString(input.sourceId, `records[${index}].sourceId`),
    field: assertNonEmptyString(input.field, `records[${index}].field`),
    observedAt,
    releasedAt,
    ingestedAt,
    revisionNumber,
    isFirstRelease: assertBoolean(input.isFirstRelease, `records[${index}].isFirstRelease`),
    sourceFingerprint: assertNonEmptyString(input.sourceFingerprint, `records[${index}].sourceFingerprint`),
    transformationId: assertNonEmptyString(input.transformationId, `records[${index}].transformationId`),
  };
}

export function createTemporalLeakagePipeline(input) {
  const config = assertObject(input, 'input');
  const timestampPrecision = assertEnum(
    config.timestampPrecision ?? 'date',
    ALLOWED_TIMESTAMP_PRECISIONS,
    'input.timestampPrecision',
  );
  const revisionMode = assertEnum(
    config.revisionMode ?? 'first-release',
    ALLOWED_REVISION_MODES,
    'input.revisionMode',
  );

  return deepFreeze({
    pipelineId: assertNonEmptyString(config.pipelineId, 'input.pipelineId'),
    version: assertNonEmptyString(config.version, 'input.version'),
    registryId: assertNonEmptyString(config.registryId, 'input.registryId'),
    registryFingerprint: assertNonEmptyString(config.registryFingerprint, 'input.registryFingerprint'),
    timestampPrecision,
    revisionMode,
    failClosed: config.failClosed !== false,
    requireRegisteredSources: config.requireRegisteredSources !== false,
    requireFingerprintMatch: config.requireFingerprintMatch !== false,
    status: 'configured-not-executed',
    externalValidationExecuted: false,
    productionScoreAllowed: false,
    notice: 'This pipeline audits temporal availability only. Passing it does not validate the IGL or authorize production use.',
  });
}

function buildRegisteredSourceMap(registry) {
  const input = assertObject(registry, 'registry');
  if (!Array.isArray(input.sources)) throw new TypeError('registry.sources must be an array');
  return new Map(input.sources.map((source) => [source.sourceId, source]));
}

function compareTimestamps(left, right, precision) {
  const normalize = (value) => precision === 'date' ? `${value}T00:00:00Z` : value;
  return Date.parse(normalize(left)) - Date.parse(normalize(right));
}

export function auditTemporalLeakage({ pipeline, registry, records }) {
  const normalizedPipeline = assertObject(pipeline, 'pipeline');
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const sourceMap = buildRegisteredSourceMap(registry);
  const normalizedRecords = records.map((record, index) => normalizeRecord(record, index, normalizedPipeline));
  const recordIds = normalizedRecords.map((record) => record.recordId);
  if (new Set(recordIds).size !== recordIds.length) throw new RangeError('recordIds must be unique');

  const violations = [];
  for (const record of normalizedRecords) {
    const source = sourceMap.get(record.sourceId);
    if (!source) {
      violations.push({ recordId: record.recordId, code: 'unregistered-source', sourceId: record.sourceId });
      continue;
    }

    if (normalizedPipeline.requireFingerprintMatch && source.fingerprint !== record.sourceFingerprint) {
      violations.push({ recordId: record.recordId, code: 'source-fingerprint-mismatch', sourceId: record.sourceId });
    }
    if (compareTimestamps(record.releasedAt, record.observedAt, normalizedPipeline.timestampPrecision) > 0) {
      violations.push({ recordId: record.recordId, code: 'released-after-observation', field: record.field });
    }
    if (compareTimestamps(record.ingestedAt, record.observedAt, normalizedPipeline.timestampPrecision) > 0) {
      violations.push({ recordId: record.recordId, code: 'ingested-after-observation', field: record.field });
    }
    if (normalizedPipeline.revisionMode === 'first-release' && (!record.isFirstRelease || record.revisionNumber !== 0)) {
      violations.push({ recordId: record.recordId, code: 'post-release-revision-used', field: record.field });
    }
    if (source.availability?.releasedAtField == null) {
      violations.push({ recordId: record.recordId, code: 'source-release-field-missing', sourceId: record.sourceId });
    }
  }

  const passed = violations.length === 0;
  return deepFreeze({
    pipelineId: normalizedPipeline.pipelineId,
    recordCount: normalizedRecords.length,
    violationCount: violations.length,
    passed,
    blocked: normalizedPipeline.failClosed && !passed,
    eligibleForDatasetSplitting: passed,
    readyForExternalValidation: false,
    readyForProduction: false,
    violations,
    nextStep: passed
      ? 'Freeze the audited records and create strictly separated development, validation, and locked-test datasets.'
      : 'Reject the affected records or correct their provenance metadata before dataset splitting.',
  });
}

export const TEMPORAL_LEAKAGE_PIPELINE_CONSTANTS = deepFreeze({
  timestampPrecisions: [...ALLOWED_TIMESTAMP_PRECISIONS],
  revisionModes: [...ALLOWED_REVISION_MODES],
});
