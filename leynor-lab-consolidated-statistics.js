function finiteNumber(value, field) {
  if (!Number.isFinite(value)) throw new TypeError(`${field} doit être un nombre fini.`);
  return Number(value);
}

function boundedNumber(value, field, min, max) {
  const normalized = finiteNumber(value, field);
  if (normalized < min || normalized > max) {
    throw new RangeError(`${field} doit être compris entre ${min} et ${max}.`);
  }
  return normalized;
}

function safeInteger(value, field) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${field} doit être un entier sûr.`);
  return value;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function quantile(sortedValues, probability) {
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  const variance = count > 1
    ? sorted.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (count - 1)
    : 0;

  return freeze({
    count,
    min: sorted[0],
    p05: quantile(sorted, 0.05),
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p95: quantile(sorted, 0.95),
    max: sorted[count - 1],
    mean,
    standardDeviation: Math.sqrt(variance)
  });
}

function normalizeObservation(input, index) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(`observations[${index}] doit être un objet.`);
  }

  const recoveryMonths = input.recoveryMonths == null
    ? null
    : boundedNumber(input.recoveryMonths, `observations[${index}].recoveryMonths`, 0, Number.MAX_SAFE_INTEGER);

  if (typeof input.goalReached !== 'boolean') {
    throw new TypeError(`observations[${index}].goalReached doit être un booléen.`);
  }

  return freeze({
    seed: safeInteger(input.seed, `observations[${index}].seed`),
    finalValue: finiteNumber(input.finalValue, `observations[${index}].finalValue`),
    returnRate: finiteNumber(input.returnRate, `observations[${index}].returnRate`),
    volatility: boundedNumber(input.volatility, `observations[${index}].volatility`, 0, Number.MAX_VALUE),
    maxDrawdown: boundedNumber(input.maxDrawdown, `observations[${index}].maxDrawdown`, 0, 1),
    lossFrequency: boundedNumber(input.lossFrequency, `observations[${index}].lossFrequency`, 0, 1),
    recoveryMonths,
    goalReached: input.goalReached,
    withdrawalImpact: finiteNumber(input.withdrawalImpact ?? 0, `observations[${index}].withdrawalImpact`)
  });
}

export function aggregateLabStatistics(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new TypeError('observations doit contenir au moins une observation.');
  }

  const normalized = observations.map(normalizeObservation);
  const recoveries = normalized
    .map(observation => observation.recoveryMonths)
    .filter(value => value !== null);
  const unrecoveredCount = normalized.length - recoveries.length;
  const goalReachedCount = normalized.filter(observation => observation.goalReached).length;
  const seeds = [...new Set(normalized.map(observation => observation.seed))].sort((a, b) => a - b);

  return freeze({
    schemaVersion: 1,
    observationCount: normalized.length,
    seedCount: seeds.length,
    seeds: Object.freeze(seeds),
    finalValue: summarize(normalized.map(observation => observation.finalValue)),
    returnRate: summarize(normalized.map(observation => observation.returnRate)),
    volatility: summarize(normalized.map(observation => observation.volatility)),
    maxDrawdown: summarize(normalized.map(observation => observation.maxDrawdown)),
    lossFrequency: summarize(normalized.map(observation => observation.lossFrequency)),
    withdrawalImpact: summarize(normalized.map(observation => observation.withdrawalImpact)),
    recoveryMonths: recoveries.length ? summarize(recoveries) : null,
    unrecoveredCount,
    unrecoveredRate: unrecoveredCount / normalized.length,
    goalReachedCount,
    goalProbability: goalReachedCount / normalized.length,
    limitations: Object.freeze([
      'Ces statistiques décrivent uniquement les observations fournies.',
      'Elles ne constituent ni une prévision de marché ni une promesse de rendement.',
      'Aucun niveau de confiance, niveau de preuve ou IGL ne peut être déduit de ce seul agrégat.'
    ])
  });
}
