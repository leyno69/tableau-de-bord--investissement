function createSeededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normal(random) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function runDailyGaussianDrawdownExperiment({
  pathCount = 10000,
  tradingDays = 252,
  annualReturn = 0.045,
  annualVolatility = 0.10,
  seed = 20260807
} = {}) {
  if (!Number.isInteger(pathCount) || pathCount < 1) throw new TypeError('pathCount doit être un entier positif.');
  if (!Number.isInteger(tradingDays) || tradingDays < 2) throw new TypeError('tradingDays doit être un entier >= 2.');
  if (!Number.isFinite(annualReturn) || annualReturn <= -1) throw new TypeError('annualReturn invalide.');
  if (!Number.isFinite(annualVolatility) || annualVolatility < 0) throw new TypeError('annualVolatility invalide.');
  const random = createSeededRandom(seed);
  const dailyMean = Math.pow(1 + annualReturn, 1 / 252) - 1;
  const dailyVolatility = annualVolatility / Math.sqrt(252);
  const drawdowns = [];
  for (let path = 0; path < pathCount; path += 1) {
    let value = 1;
    let peak = 1;
    let maxDrawdown = 0;
    for (let day = 0; day < tradingDays; day += 1) {
      value = Math.max(0, value * (1 + dailyMean + dailyVolatility * normal(random)));
      peak = Math.max(peak, value);
      maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - value) / peak : 0);
    }
    drawdowns.push(maxDrawdown);
  }
  drawdowns.sort((a, b) => a - b);
  return Object.freeze({
    schemaVersion: 1,
    pathCount,
    tradingDays,
    annualReturn,
    annualVolatility,
    seed,
    drawdown: Object.freeze({
      median: percentile(drawdowns, 0.5),
      p95: percentile(drawdowns, 0.95),
      p99: percentile(drawdowns, 0.99),
      maximum: drawdowns.at(-1)
    }),
    methodology: Object.freeze({
      model: 'daily-gaussian-experimental',
      status: 'experimental-comparator-only',
      statement: 'Ce modèle sert uniquement à apparier la fréquence quotidienne du drawdown historique. Il ne remplace pas le moteur mensuel de référence.'
    })
  });
}
