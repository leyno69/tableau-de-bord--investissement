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

export function simulateContributionPathSet({ seed, paths, years, scenario, assumptions }) {
  if (!Number.isInteger(seed) || seed < 1) throw new RangeError('seed doit être un entier positif.');
  if (!Number.isInteger(paths) || paths < 1) throw new RangeError('paths doit être un entier positif.');
  if (!Number.isInteger(years) || years < 1) throw new RangeError('years doit être un entier positif.');
  if (!['regular', 'interruption'].includes(scenario)) throw new RangeError('scenario non supporté.');
  const random = createRng(seed);
  const months = years * 12;
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const monthlyVolatility = assumptions.annualVolatility / Math.sqrt(12);
  const finalValues = [];
  const maximumDrawdowns = [];
  let aboveContributionsCount = 0;

  for (let path = 0; path < paths; path += 1) {
    let value = assumptions.initialCapital;
    let totalContributions = assumptions.initialCapital;
    let peak = value;
    let maximumDrawdown = 0;
    for (let month = 1; month <= months; month += 1) {
      const interrupted = scenario === 'interruption' && month >= assumptions.interruptionStartMonth && month <= assumptions.interruptionEndMonth;
      const contribution = interrupted ? 0 : assumptions.monthlyContribution;
      value += contribution;
      totalContributions += contribution;
      const monthlyReturn = Math.exp(monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * standardNormal(random));
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
    scenario,
    years,
    paths,
    finalP10: quantile(finalValues, 0.1),
    finalMedian: quantile(finalValues, 0.5),
    finalP90: quantile(finalValues, 0.9),
    drawdownMedian: quantile(maximumDrawdowns, 0.5),
    drawdownP90: quantile(maximumDrawdowns, 0.9),
    probabilityAboveContributions: aboveContributionsCount / paths
  });
}

function aggregateReplications(rows) {
  const keys = ['finalP10', 'finalMedian', 'finalP90', 'drawdownMedian', 'drawdownP90', 'probabilityAboveContributions'];
  return Object.freeze(Object.fromEntries(keys.map((key) => {
    const values = rows.map((row) => row[key]);
    return [key, Object.freeze({ median: quantile(values, 0.5), min: Math.min(...values), max: Math.max(...values) })];
  })));
}

export function runContributionInterruptionCampaign(config) {
  const replications = [];
  for (const scenario of config.scenarios) {
    for (const years of config.horizons) {
      for (const seed of config.seeds) {
        replications.push(simulateContributionPathSet({ seed, paths: config.pathsPerReplication, years, scenario, assumptions: config.assumptions }));
      }
    }
  }
  const summary = [];
  for (const scenario of config.scenarios) {
    for (const years of config.horizons) {
      const rows = replications.filter((row) => row.scenario === scenario && row.years === years);
      summary.push(Object.freeze({ scenario, years, paths: rows.reduce((total, row) => total + row.paths, 0), replications: rows.length, metrics: aggregateReplications(rows) }));
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    model: Object.freeze({ ...config.assumptions, distribution: 'independent-lognormal-monthly-returns', notice: 'Scenario comparison, not a forecast.' }),
    seeds: Object.freeze([...config.seeds]),
    horizons: Object.freeze([...config.horizons]),
    pathsPerReplication: config.pathsPerReplication,
    totalPaths: replications.reduce((total, row) => total + row.paths, 0),
    summary: Object.freeze(summary),
    replications: Object.freeze(replications),
    limitations: Object.freeze([...config.limitations])
  });
}
