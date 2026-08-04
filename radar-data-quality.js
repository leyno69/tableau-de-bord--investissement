const SOURCE_KINDS = Object.freeze([
  'market',
  'fundamental',
  'macro',
  'news',
  'sentiment',
  'positioning',
  'technical',
  'event',
  'alternative'
]);

const QUALITY_STATUSES = Object.freeze(['accepted', 'degraded', 'rejected']);

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function integer(value, field) {
  const number = finiteNumber(value, field);
  if (!Number.isInteger(number)) throw new TypeError(`${field} doit être un entier.`);
  return number;
}

function percentage(value, field) {
  const number = finiteNumber(value, field);
  if (number < 0 || number > 1) throw new RangeError(`${field} doit être compris entre 0 et 1.`);
  return number;
}

function timestamp(value, field) {
  const text = requiredText(value, field);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} doit être une date ISO valide.`);
  return date.toISOString();
}

function stringList(values, field) {
  if (!Array.isArray(values)) throw new TypeError(`${field} doit être un tableau.`);
  return Object.freeze(values.map((value, index) => requiredText(value, `${field}[${index}]`)));
}

export function createRadarSourceDefinition({
  id,
  name,
  kind,
  provider,
  endpoint = 'internal',
  expectedLatencyMs,
  maximumAgeMs,
  minimumCoverage = 0.95,
  minimumCompleteness = 0.95,
  license,
  methodology,
  limitations = []
}) {
  const normalizedKind = requiredText(kind, 'kind');
  if (!SOURCE_KINDS.includes(normalizedKind)) {
    throw new RangeError(`kind doit appartenir à : ${SOURCE_KINDS.join(', ')}.`);
  }

  const definition = {
    id: requiredText(id, 'id'),
    name: requiredText(name, 'name'),
    kind: normalizedKind,
    provider: requiredText(provider, 'provider'),
    endpoint: requiredText(endpoint, 'endpoint'),
    expectedLatencyMs: integer(expectedLatencyMs, 'expectedLatencyMs'),
    maximumAgeMs: integer(maximumAgeMs, 'maximumAgeMs'),
    minimumCoverage: percentage(minimumCoverage, 'minimumCoverage'),
    minimumCompleteness: percentage(minimumCompleteness, 'minimumCompleteness'),
    license: requiredText(license, 'license'),
    methodology: requiredText(methodology, 'methodology'),
    limitations: stringList(limitations, 'limitations')
  };

  if (definition.expectedLatencyMs < 0 || definition.maximumAgeMs <= 0) {
    throw new RangeError('Les contraintes temporelles doivent être positives.');
  }

  return Object.freeze(definition);
}

export function createRadarObservation({
  source,
  assetId,
  observedAt,
  receivedAt,
  value,
  unit,
  coverage = 1,
  completeness = 1,
  lineageId,
  datasetFingerprint,
  flags = []
}) {
  if (!source || typeof source !== 'object') throw new TypeError('source est obligatoire.');
  const observation = {
    source,
    assetId: requiredText(assetId, 'assetId'),
    observedAt: timestamp(observedAt, 'observedAt'),
    receivedAt: timestamp(receivedAt, 'receivedAt'),
    value,
    unit: requiredText(unit, 'unit'),
    coverage: percentage(coverage, 'coverage'),
    completeness: percentage(completeness, 'completeness'),
    lineageId: requiredText(lineageId, 'lineageId'),
    datasetFingerprint: requiredText(datasetFingerprint, 'datasetFingerprint'),
    flags: stringList(flags, 'flags')
  };
  return Object.freeze(observation);
}

export function assessRadarObservation(observation, now = new Date()) {
  if (!observation?.source) throw new TypeError('Une observation complète est obligatoire.');
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) throw new TypeError('now doit être une date valide.');

  const observedAt = new Date(observation.observedAt);
  const receivedAt = new Date(observation.receivedAt);
  const ageMs = Math.max(0, current.getTime() - observedAt.getTime());
  const latencyMs = Math.max(0, receivedAt.getTime() - observedAt.getTime());
  const reasons = [];

  if (ageMs > observation.source.maximumAgeMs) reasons.push('stale');
  if (latencyMs > observation.source.expectedLatencyMs) reasons.push('late');
  if (observation.coverage < observation.source.minimumCoverage) reasons.push('coverage_below_threshold');
  if (observation.completeness < observation.source.minimumCompleteness) reasons.push('incomplete');
  if (observation.flags.length > 0) reasons.push('flagged');

  const hardFailure = reasons.includes('stale') || reasons.includes('coverage_below_threshold') || reasons.includes('incomplete');
  const status = hardFailure ? 'rejected' : reasons.length ? 'degraded' : 'accepted';

  return Object.freeze({
    status,
    usable: status !== 'rejected',
    ageMs,
    latencyMs,
    reasons: Object.freeze(reasons),
    sourceId: observation.source.id,
    lineageId: observation.lineageId,
    datasetFingerprint: observation.datasetFingerprint,
    assessedAt: current.toISOString()
  });
}

export function summarizeRadarDataset(observations, now = new Date()) {
  if (!Array.isArray(observations)) throw new TypeError('observations doit être un tableau.');
  const assessments = observations.map(observation => assessRadarObservation(observation, now));
  const counts = QUALITY_STATUSES.reduce((result, status) => {
    result[status] = assessments.filter(item => item.status === status).length;
    return result;
  }, {});
  const total = assessments.length;
  const usable = counts.accepted + counts.degraded;
  const sourceKinds = new Set(observations.map(item => item.source.kind));
  const sourceIds = new Set(observations.map(item => item.source.id));

  return Object.freeze({
    total,
    usable,
    rejected: counts.rejected,
    accepted: counts.accepted,
    degraded: counts.degraded,
    usableRatio: total === 0 ? 0 : usable / total,
    independentSourceCount: sourceIds.size,
    sourceKindCount: sourceKinds.size,
    assessments: Object.freeze(assessments)
  });
}

export function canProduceRadarSignal(summary, {
  minimumUsableRatio = 0.8,
  minimumIndependentSources = 3,
  minimumSourceKinds = 2
} = {}) {
  if (!summary || typeof summary !== 'object') throw new TypeError('summary est obligatoire.');
  const reasons = [];
  if (summary.total === 0) reasons.push('no_observations');
  if (summary.usableRatio < percentage(minimumUsableRatio, 'minimumUsableRatio')) reasons.push('insufficient_usable_ratio');
  if (summary.independentSourceCount < integer(minimumIndependentSources, 'minimumIndependentSources')) reasons.push('insufficient_independent_sources');
  if (summary.sourceKindCount < integer(minimumSourceKinds, 'minimumSourceKinds')) reasons.push('insufficient_source_diversity');

  return Object.freeze({
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons)
  });
}

export { QUALITY_STATUSES, SOURCE_KINDS };
