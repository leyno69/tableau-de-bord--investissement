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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function coefficientOfVariation(values) {
  const average = mean(values);
  if (average === 0) return null;
  return Math.abs(sampleStandardDeviation(values) / average);
}

function relativeRange(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const denominator = Math.max(Math.abs(mean(values)), Number.EPSILON);
  return (maximum - minimum) / denominator;
}

function normalizeObservation(input, index) {
  if (!Number.isSafeInteger(input?.seed)) throw new TypeError(`observations[${index}].seed doit être un entier sûr.`);
  if (!input.metrics || typeof input.metrics !== 'object' || Array.isArray(input.metrics)) {
    throw new TypeError(`observations[${index}].metrics doit être un objet.`);
  }

  const metrics = {};
  for (const [name, rawValue] of Object.entries(input.metrics)) {
    const metricName = requiredText(name, `observations[${index}].metrics.name`);
    metrics[metricName] = finiteNumber(rawValue, `observations[${index}].metrics.${metricName}`);
  }
  if (Object.keys(metrics).length === 0) throw new TypeError(`observations[${index}].metrics doit contenir au moins une métrique.`);

  return Object.freeze({ seed: input.seed, metrics: Object.freeze(metrics) });
}

export function analyzeSeedStability({ campaignId, observations, minimumSeeds = 3 }) {
  const normalizedCampaignId = requiredText(campaignId, 'campaignId');
  if (!Array.isArray(observations) || observations.length < 2) {
    throw new TypeError('observations doit contenir au moins deux graines.');
  }
  if (!Number.isSafeInteger(minimumSeeds) || minimumSeeds < 2) {
    throw new TypeError('minimumSeeds doit être un entier supérieur ou égal à 2.');
  }

  const normalized = observations.map(normalizeObservation)
    .sort((left, right) => left.seed - right.seed);
  const seeds = normalized.map(item => item.seed);
  if (new Set(seeds).size !== seeds.length) throw new Error('Chaque graine doit être unique dans une analyse de stabilité.');

  const metricNames = [...new Set(normalized.flatMap(item => Object.keys(item.metrics)))].sort();
  const metrics = {};
  const missingMetrics = [];

  for (const metricName of metricNames) {
    const available = normalized.filter(item => Object.hasOwn(item.metrics, metricName));
    const values = available.map(item => item.metrics[metricName]);
    if (available.length !== normalized.length) missingMetrics.push(metricName);

    metrics[metricName] = Object.freeze({
      observationCount: values.length,
      seedCoverage: values.length / normalized.length,
      mean: mean(values),
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      standardDeviation: sampleStandardDeviation(values),
      coefficientOfVariation: coefficientOfVariation(values),
      relativeRange: relativeRange(values),
      valuesBySeed: Object.freeze(available.map(item => Object.freeze({ seed: item.seed, value: item.metrics[metricName] })))
    });
  }

  return deepFreeze({
    schemaVersion: 1,
    campaignId: normalizedCampaignId,
    seedCount: seeds.length,
    minimumSeeds,
    sufficientSeedCount: seeds.length >= minimumSeeds,
    seeds: Object.freeze(seeds),
    metrics,
    incompleteMetrics: Object.freeze(missingMetrics.sort()),
    limitations: Object.freeze([
      'Cette analyse décrit la stabilité entre les graines fournies uniquement.',
      'Elle ne constitue ni un niveau de confiance, ni un niveau de preuve, ni une prévision.',
      'Une faible dispersion entre graines ne valide pas à elle seule les hypothèses du modèle.'
    ])
  });
}
