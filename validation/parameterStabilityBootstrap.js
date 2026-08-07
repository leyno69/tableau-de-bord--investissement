function createSeededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function finiteSeries(values) {
  if (!Array.isArray(values) || values.length < 12) throw new TypeError('returns doit contenir au moins 12 observations.');
  return values.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`returns[${index}] doit être fini.`);
    return number;
  });
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function sampleStd(values) {
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}
function percentile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function bootstrapMonthlyParameterStability({
  returns,
  targetAnnualReturn = 0.045,
  targetAnnualVolatility = 0.10,
  replicates = 10000,
  seed = 20260807,
  alpha = 0.05
} = {}) {
  const sample = finiteSeries(returns);
  if (!Number.isInteger(replicates) || replicates < 100) throw new TypeError('replicates doit être un entier >= 100.');
  if (!(alpha > 0 && alpha < 1)) throw new TypeError('alpha doit être compris entre 0 et 1.');
  const random = createSeededRandom(seed);
  const bootstrapMeans = [];
  const bootstrapStd = [];
  for (let replicate = 0; replicate < replicates; replicate += 1) {
    const resampled = Array.from({ length: sample.length }, () => sample[Math.floor(random() * sample.length)]);
    bootstrapMeans.push(mean(resampled));
    bootstrapStd.push(sampleStd(resampled));
  }
  bootstrapMeans.sort((a, b) => a - b);
  bootstrapStd.sort((a, b) => a - b);
  const lowerP = alpha / 2;
  const upperP = 1 - alpha / 2;
  const targetMonthlyMean = Math.pow(1 + targetAnnualReturn, 1 / 12) - 1;
  const targetMonthlyVolatility = targetAnnualVolatility / Math.sqrt(12);
  const meanInterval = Object.freeze({ lower: percentile(bootstrapMeans, lowerP), upper: percentile(bootstrapMeans, upperP) });
  const volatilityInterval = Object.freeze({ lower: percentile(bootstrapStd, lowerP), upper: percentile(bootstrapStd, upperP) });
  return Object.freeze({
    schemaVersion: 1,
    observationCount: sample.length,
    replicates,
    seed,
    alpha,
    empirical: Object.freeze({ monthlyMean: mean(sample), monthlyVolatility: sampleStd(sample) }),
    target: Object.freeze({ annualReturn: targetAnnualReturn, annualVolatility: targetAnnualVolatility, monthlyMean: targetMonthlyMean, monthlyVolatility: targetMonthlyVolatility }),
    intervals: Object.freeze({ monthlyMean: meanInterval, monthlyVolatility: volatilityInterval }),
    compatibility: Object.freeze({
      returnTargetInsideInterval: targetMonthlyMean >= meanInterval.lower && targetMonthlyMean <= meanInterval.upper,
      volatilityTargetInsideInterval: targetMonthlyVolatility >= volatilityInterval.lower && targetMonthlyVolatility <= volatilityInterval.upper
    }),
    interpretation: Object.freeze({
      statement: 'La compatibilité bootstrap indique seulement si les paramètres cibles sont plausibles sous cet échantillon empirique. Elle ne constitue ni une estimation optimale ni une garantie de stabilité future.'
    })
  });
}
