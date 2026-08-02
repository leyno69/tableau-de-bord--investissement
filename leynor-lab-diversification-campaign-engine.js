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

export function quantile(values, probability) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('values doit être un tableau non vide.');
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new RangeError('probability doit être comprise entre 0 et 1.');
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const fraction = position - lowerIndex;
  const lower = ordered[lowerIndex];
  const upper = ordered[lowerIndex + 1] ?? lower;
  return lower + (upper - lower) * fraction;
}

export function portfolioVolatility({ assetVolatility, holdings, averageCorrelation }) {
  if (!(assetVolatility > 0)) throw new RangeError('assetVolatility doit être positif.');
  if (!Number.isInteger(holdings) || holdings < 1) throw new RangeError('holdings doit être un entier positif.');
  if (!(averageCorrelation >= 0 && averageCorrelation <= 1)) throw new RangeError('averageCorrelation doit être comprise entre 0 et 1.');
  return assetVolatility * Math.sqrt(averageCorrelation + (1 - averageCorrelation) / holdings);
}

export function simulateDiversificationPathSet({ seed, paths, years, scenario, assumptions }) {
  const random = createRng(seed);
  const months = years * 12;
  const annualVolatility = portfolioVolatility({
    assetVolatility: assumptions.assetVolatility,
    holdings: scenario.holdings,
    averageCorrelation: scenario.averageCorrelation
  });
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const monthlyVolatility = annualVolatility / Math.sqrt(12);
  const finalValues = [];
  const maximumDrawdowns = [];
  const totalContributions = assumptions.initialCapital + assumptions.monthlyContribution * months;
  let aboveContributionsCount = 0;

  for (let path = 0; path < paths; path += 1) {
    let value = assumptions.initialCapital;
    let peak = value;
    let maximumDrawdown = 0;
    for (let month = 0; month < months; month += 1) {
      value += assumptions.monthlyContribution;
      const monthlyReturn = Math.exp(
        monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * standardNormal(random)
      );
      value *= monthlyReturn;
      peak = Math.max(peak, value);
      maximumDrawdown = Math.max(maximumDrawdown, (peak - value) / peak);
    }
    finalValues.push(value);
    maximumDrawdowns.push(maximumDrawdown);
    if (value >= totalContributions) aboveContributionsCount += 1;
  }

  return Object.freeze({
    seed,
    scenario: scenario.id,
    years,
    paths,
    annualVolatility,
    finalP10: quantile(finalValues, 0.1),
    finalMedian: quantile(finalValues, 0.5),
    finalP90: quantile(finalValues, 0.9),
    drawdownMedian: quantile(maximumDrawdowns, 0.5),
    drawdownP90: quantile(maximumDrawdowns, 0.9),
    probabilityAboveContributions: aboveContributionsCount / paths
  });
}

export function runDiversificationCampaign(config) {
  const replications = [];
  for (const scenario of config.scenarios) {
    for (const years of config.horizons) {
      for (const seed of config.seeds) {
        replications.push(simulateDiversificationPathSet({
          seed,
          paths: config.pathsPerReplication,
          years,
          scenario,
          assumptions: config.assumptions
        }));
      }
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    totalPaths: replications.reduce((sum, row) => sum + row.paths, 0),
    seeds: Object.freeze([...config.seeds]),
    horizons: Object.freeze([...config.horizons]),
    scenarios: Object.freeze(config.scenarios.map((scenario) => Object.freeze({ ...scenario }))),
    replications: Object.freeze(replications),
    notice: 'Scenario comparison, not a forecast.',
    limitations: Object.freeze([...config.limitations])
  });
}
