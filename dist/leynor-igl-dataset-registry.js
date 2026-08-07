import { createHash } from 'node:crypto';

const ALLOWED_PURPOSES = Object.freeze(['development', 'validation', 'locked-test']);
const ALLOWED_STATUSES = Object.freeze(['registered', 'frozen', 'retired']);

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertIsoTimestamp(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${name} must be ISO-compatible`);
  return normalized;
}

function assertEnum(value, allowed, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!allowed.includes(normalized)) throw new RangeError(`unsupported ${name}: ${normalized}`);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function normalizeDataset(input, index) {
  const dataset = assertObject(input, `datasets[${index}]`);
  const sourceFingerprints = Array.isArray(dataset.sourceFingerprints)
    ? dataset.sourceFingerprints.map((value, sourceIndex) => assertNonEmptyString(value, `datasets[${index}].sourceFingerprints[${sourceIndex}]`)).sort()
    : (() => { throw new TypeError(`datasets[${index}].sourceFingerprints must be an array`); })();
  if (sourceFingerprints.length === 0) throw new RangeError(`datasets[${index}].sourceFingerprints must not be empty`);
  if (new Set(sourceFingerprints).size !== sourceFingerprints.length) throw new RangeError(`datasets[${index}].sourceFingerprints must be unique`);

  const recordCount = Number(dataset.recordCount);
  if (!Number.isInteger(recordCount) || recordCount < 0) throw new TypeError(`datasets[${index}].recordCount must be a non-negative integer`);

  const normalized = {
    datasetId: assertNonEmptyString(dataset.datasetId, `datasets[${index}].datasetId`),
    version: assertNonEmptyString(dataset.version, `datasets[${index}].version`),
    purpose: assertEnum(dataset.purpose, ALLOWED_PURPOSES, `datasets[${index}].purpose`),
    status: assertEnum(dataset.status ?? 'registered', ALLOWED_STATUSES, `datasets[${index}].status`),
    createdAt: assertIsoTimestamp(dataset.createdAt, `datasets[${index}].createdAt`),
    period: {
      start: assertIsoTimestamp(dataset.period?.start, `datasets[${index}].period.start`),
      end: assertIsoTimestamp(dataset.period?.end, `datasets[${index}].period.end`),
    },
    recordCount,
    schemaVersion: assertNonEmptyString(dataset.schemaVersion, `datasets[${index}].schemaVersion`),
    transformationId: assertNonEmptyString(dataset.transformationId, `datasets[${index}].transformationId`),
    sourceFingerprints,
    pointInTimeVerified: dataset.pointInTimeVerified === true,
    licenceVerified: dataset.licenceVerified === true,
    survivorshipBiasAudited: dataset.survivorshipBiasAudited === true,
    revisionsAudited: dataset.revisionsAudited === true,
  };
  if (Date.parse(normalized.period.start) > Date.parse(normalized.period.end)) {
    throw new RangeError(`datasets[${index}].period.start must be before or equal to period.end`);
  }
  return { ...normalized, fingerprint: fingerprint(normalized) };
}

export function createDatasetRegistry({ registryId, version, createdAt, datasets }) {
  if (!Array.isArray(datasets)) throw new TypeError('datasets must be an array');
  const normalized = datasets.map(normalizeDataset).sort((a, b) => a.datasetId.localeCompare(b.datasetId));
  const identities = normalized.map((dataset) => `${dataset.datasetId}@${dataset.version}`);
  if (new Set(identities).size !== identities.length) throw new RangeError('dataset id/version pairs must be unique');

  const payload = {
    registryId: assertNonEmptyString(registryId, 'registryId'),
    version: assertNonEmptyString(version, 'version'),
    createdAt: assertIsoTimestamp(createdAt, 'createdAt'),
    datasets: normalized,
  };
  return deepFreeze({
    ...payload,
    fingerprint: fingerprint(payload),
    readyForExternalValidation: false,
    readyForProduction: false,
  });
}

export function auditDatasetRegistry(registry) {
  const input = assertObject(registry, 'registry');
  if (!Array.isArray(input.datasets)) throw new TypeError('registry.datasets must be an array');
  const blockers = [];
  for (const dataset of input.datasets) {
    if (!dataset.pointInTimeVerified) blockers.push({ datasetId: dataset.datasetId, code: 'point-in-time-unverified' });
    if (!dataset.licenceVerified) blockers.push({ datasetId: dataset.datasetId, code: 'licence-unverified' });
    if (!dataset.survivorshipBiasAudited) blockers.push({ datasetId: dataset.datasetId, code: 'survivorship-bias-unaudited' });
    if (!dataset.revisionsAudited) blockers.push({ datasetId: dataset.datasetId, code: 'revisions-unaudited' });
    if (dataset.status !== 'frozen') blockers.push({ datasetId: dataset.datasetId, code: 'dataset-not-frozen' });
  }
  return deepFreeze({
    registryId: input.registryId,
    datasetCount: input.datasets.length,
    blockerCount: blockers.length,
    blockers,
    eligibleForExternalValidation: input.datasets.length > 0 && blockers.length === 0,
    readyForExternalValidation: false,
    readyForProduction: false,
  });
}

export const DATASET_REGISTRY_CONSTANTS = deepFreeze({
  purposes: [...ALLOWED_PURPOSES],
  statuses: [...ALLOWED_STATUSES],
});
