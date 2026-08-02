function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function standardNormal(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function portfolioVolatility({ lineCount, assetVolatility, correlation }) {
  if (!Number.isInteger(lineCount) || lineCount < 2) throw new RangeError('lineCount doit être supérieur ou égal à 2.');
  if (!(assetVolatility > 0)) throw new RangeError('assetVolatility doit être positif.');
  if (correlation < -1 || correlation > 1) throw new RangeError('correlation doit être comprise entre -1 et 1.');
  const varianceFactor = (1 + (lineCount - 1) * correlation) / lineCount;
  if (varianceFactor < 0) throw new RangeError('combinaison lineCount/correlation invalide.');
  return assetVolatility * Math.sqrt(varianceFactor);
}

export function quantile(values, probability) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('values doit être un tableau non vide.');
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new RangeError('probability invalide.');
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const fraction = position - lowerIndex;
  const lower = ordered[lowerIndex];
  const upper = ordered[lowerIndex + 1] ?? lower;
  return lower + (upper - lower) * fraction;
}

export function simulateLineCountPathSet({ seed, paths, years, lineCount, assumptions }) {
  const random = createRng(seed + lineCount * 1000 + years);
  const months = years * 12;
  const annualVolatility = portfolioVolatility({
    lineCount,
    assetVolatility: assumptions.assetVolatility,
    correlation: assumptions.correlation
  });
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const monthlyVolatility = annualVolatility / Math.sqrt(12);
  const finalValues = [];
  const drawdowns = [];

  for (let path = 0; path < paths; path += 1) {
    let value = assumptions.initialCapital;
    let peak = value;
    let maximumDrawdown = 0;
    for (let month = 0; month < months; month += 1) {
      value += assumptions.monthlyContribution;
      value *= Math.exp(monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * standardNormal(random));
      peak = Math.max(peak, value);
      maximumDrawdown = Math.max(maximumDrawdown, (peak - value) / peak);
    }
    finalValues.push(value);
    drawdowns.push(maximumDrawdown);
  }

  return Object.freeze({
    seed, paths, years, lineCount, annualVolatility,
    finalP10: quantile(finalValues, 0.1),
    finalMedian: quantile(finalValues, 0.5),
    finalP90: quantile(finalValues, 0.9),
    drawdownMedian: quantile(drawdowns, 0.5),
    drawdownP90: quantile(drawdowns, 0.9)
  });
}

export function runLineCountCampaign(config) {
  const replications = [];
  for (const lineCount of config.lineCounts) {
    for (const years of config.horizons) {
      for (const seed of config.seeds) {
        replications.push(simulateLineCountPathSet({
          seed, paths: config.pathsPerReplication, years, lineCount, assumptions: config.assumptions
        }));
      }
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    totalPaths: replications.reduce((sum, row) => sum + row.paths, 0),
    lineCounts: Object.freeze([...config.lineCounts]),
    horizons: Object.freeze([...config.horizons]),
    seeds: Object.freeze([...config.seeds]),
    assumptions: Object.freeze({ ...config.assumptions }),
    notice: 'Scenario comparison, not a forecast.',
    replications: Object.freeze(replications),
    limitations: Object.freeze([...config.limitations])
  });
}
