const ALLOWED_SPLIT_ROLES = Object.freeze(['development', 'validation', 'locked-test']);
const ALLOWED_BASELINES = Object.freeze([
  'line-count-only',
  'maximum-position-weight',
  'historical-volatility-only',
  'equal-weighted-components',
  'allocation-only',
]);

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function assertIsoDate(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${name} must be an ISO date (YYYY-MM-DD)`);
  }
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeArray(values, name) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(`${name} must be a non-empty array`);
  const normalized = values.map((value, index) => assertNonEmptyString(value, `${name}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new RangeError(`${name} must not contain duplicates`);
  return normalized;
}

function normalizeSplit(split) {
  if (!split || typeof split !== 'object') throw new TypeError('each split must be an object');
  const role = assertNonEmptyString(split.role, 'split.role');
  if (!ALLOWED_SPLIT_ROLES.includes(role)) throw new RangeError(`unsupported split role: ${role}`);
  const startDate = assertIsoDate(split.startDate, 'split.startDate');
  const endDate = assertIsoDate(split.endDate, 'split.endDate');
  if (startDate > endDate) throw new RangeError('split.startDate must be before or equal to split.endDate');
  return {
    role,
    datasetId: assertNonEmptyString(split.datasetId, 'split.datasetId'),
    datasetFingerprint: assertNonEmptyString(split.datasetFingerprint, 'split.datasetFingerprint'),
    startDate,
    endDate,
    locked: role === 'locked-test' ? split.locked !== false : Boolean(split.locked),
  };
}

function assertIndependentSplits(splits) {
  const roles = new Set(splits.map((split) => split.role));
  for (const role of ALLOWED_SPLIT_ROLES) {
    if (!roles.has(role)) throw new RangeError(`missing required split role: ${role}`);
  }
  if (roles.size !== splits.length) throw new RangeError('each split role must appear exactly once');
  const fingerprints = splits.map((split) => split.datasetFingerprint);
  if (new Set(fingerprints).size !== fingerprints.length) {
    throw new RangeError('development, validation and locked-test datasets must be independent');
  }
  const lockedTest = splits.find((split) => split.role === 'locked-test');
  if (!lockedTest.locked) throw new RangeError('locked-test split must remain locked');
}

export function auditTemporalAvailability(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const violations = [];
  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== 'object') throw new TypeError(`records[${index}] must be an object`);
    const observationDate = assertIsoDate(record.observationDate, `records[${index}].observationDate`);
    const availableAt = assertIsoDate(record.availableAt, `records[${index}].availableAt`);
    if (availableAt > observationDate) {
      violations.push({
        index,
        field: assertNonEmptyString(record.field, `records[${index}].field`),
        observationDate,
        availableAt,
        reason: 'data was not available at the observation date',
      });
    }
  }
  return deepFreeze({
    recordCount: records.length,
    violationCount: violations.length,
    passed: violations.length === 0,
    violations,
  });
}

export function createExternalValidationProtocol(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input must be an object');
  const splits = (input.splits ?? []).map(normalizeSplit);
  assertIndependentSplits(splits);

  const baselines = normalizeArray(input.baselines, 'baselines');
  for (const baseline of baselines) {
    if (!ALLOWED_BASELINES.includes(baseline)) throw new RangeError(`unsupported baseline: ${baseline}`);
  }

  const primaryOutcomes = normalizeArray(input.primaryOutcomes, 'primaryOutcomes');
  const acceptanceCriteria = normalizeArray(input.acceptanceCriteria, 'acceptanceCriteria');
  const prohibitedAdjustments = normalizeArray(input.prohibitedAdjustments, 'prohibitedAdjustments');

  const protocol = {
    protocolId: assertNonEmptyString(input.protocolId, 'protocolId'),
    version: assertNonEmptyString(input.version, 'version'),
    registeredAt: assertIsoDate(input.registeredAt, 'registeredAt'),
    constructDefinition: assertNonEmptyString(input.constructDefinition, 'constructDefinition'),
    primaryOutcomes,
    splits: splits.sort((a, b) => ALLOWED_SPLIT_ROLES.indexOf(a.role) - ALLOWED_SPLIT_ROLES.indexOf(b.role)),
    baselines,
    acceptanceCriteria,
    prohibitedAdjustments,
    independentReviewerRequired: input.independentReviewerRequired !== false,
    productionScoreAllowed: false,
    status: 'preregistered-not-executed',
    notice: 'This protocol defines an external validation study. It does not validate the IGL and does not authorize a production score.',
  };

  return deepFreeze(protocol);
}

export function auditExternalValidationReadiness(protocol) {
  if (!protocol || typeof protocol !== 'object') throw new TypeError('protocol is required');
  const blockers = [];
  if (protocol.status !== 'preregistered-not-executed') blockers.push('protocol-status-invalid');
  if (protocol.productionScoreAllowed !== false) blockers.push('production-score-must-remain-disabled');
  if (!protocol.independentReviewerRequired) blockers.push('independent-review-required');
  if (!Array.isArray(protocol.baselines) || protocol.baselines.length < 2) blockers.push('at-least-two-baselines-required');
  if (!Array.isArray(protocol.primaryOutcomes) || protocol.primaryOutcomes.length === 0) blockers.push('primary-outcome-required');
  if (!Array.isArray(protocol.acceptanceCriteria) || protocol.acceptanceCriteria.length === 0) blockers.push('acceptance-criteria-required');
  const lockedTest = protocol.splits?.find((split) => split.role === 'locked-test');
  if (!lockedTest?.locked) blockers.push('locked-test-not-locked');

  return deepFreeze({
    readyForDataAcquisition: blockers.length === 0,
    readyForProduction: false,
    blockers,
    nextStep: blockers.length === 0
      ? 'Acquire licensed point-in-time datasets and execute temporal leakage audits before any model comparison.'
      : 'Resolve protocol blockers before acquiring or analysing validation data.',
  });
}

export const EXTERNAL_VALIDATION_CONSTANTS = deepFreeze({
  splitRoles: [...ALLOWED_SPLIT_ROLES],
  allowedBaselines: [...ALLOWED_BASELINES],
});
