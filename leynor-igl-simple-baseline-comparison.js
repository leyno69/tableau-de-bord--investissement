const ALLOWED_METRICS = Object.freeze(['mae', 'brier']);

function assertArray(values, name) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(`${name} must be a non-empty array`);
  return values.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${name}[${index}] must be finite`);
    return number;
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function score(metric, predictions, outcomes) {
  if (metric === 'mae') {
    return predictions.reduce((sum, value, index) => sum + Math.abs(value - outcomes[index]), 0) / predictions.length;
  }
  return predictions.reduce((sum, value, index) => {
    if (value < 0 || value > 1 || outcomes[index] < 0 || outcomes[index] > 1) {
      throw new RangeError('brier inputs must be between 0 and 1');
    }
    return sum + (value - outcomes[index]) ** 2;
  }, 0) / predictions.length;
}

export function compareCandidateWithBaselines({ metric = 'mae', outcomes, candidate, baselines }) {
  if (!ALLOWED_METRICS.includes(metric)) throw new RangeError(`unsupported metric: ${metric}`);
  const normalizedOutcomes = assertArray(outcomes, 'outcomes');
  const normalizedCandidate = assertArray(candidate, 'candidate');
  if (normalizedCandidate.length !== normalizedOutcomes.length) throw new RangeError('candidate length must match outcomes');
  if (!baselines || typeof baselines !== 'object' || Array.isArray(baselines)) throw new TypeError('baselines must be an object');

  const entries = Object.entries(baselines);
  if (entries.length < 2) throw new RangeError('at least two simple baselines are required');
  const baselineScores = entries.map(([baselineId, values]) => {
    const normalized = assertArray(values, `baselines.${baselineId}`);
    if (normalized.length !== normalizedOutcomes.length) throw new RangeError(`${baselineId} length must match outcomes`);
    return { baselineId, score: score(metric, normalized, normalizedOutcomes) };
  }).sort((left, right) => left.score - right.score || left.baselineId.localeCompare(right.baselineId));

  const candidateScore = score(metric, normalizedCandidate, normalizedOutcomes);
  const bestBaseline = baselineScores[0];
  return deepFreeze({
    metric,
    observationCount: normalizedOutcomes.length,
    candidateScore,
    baselineScores,
    bestBaseline,
    candidateBeatsBestBaseline: candidateScore < bestBaseline.score,
    absoluteImprovement: bestBaseline.score - candidateScore,
    externallyValidated: false,
    productionReady: false,
    notice: 'This deterministic comparison reports supplied observations only. It is not external validation unless executed on a preregistered locked test with independently verified data.',
  });
}

export const SIMPLE_BASELINE_COMPARISON_CONSTANTS = deepFreeze({ metrics: [...ALLOWED_METRICS] });
