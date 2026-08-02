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

export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object') throw new TypeError('scenario requis.');
  if (!Number.isInteger(scenario.assetCount) || scenario.assetCount < 2) throw new RangeError('assetCount doit être >= 2.');
  if (!Array.isArray(scenario.targetWeights) || scenario.targetWeights.length !== scenario.assetCount) throw new RangeError('targetWeights incohérents.');
  const total = scenario.targetWeights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 1) > 1e-9 || scenario.targetWeights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    throw new RangeError('targetWeights doit contenir des poids positifs totalisant 1.');
  }
  if (!Number.isFinite(scenario.correlation) || scenario.correlation < 0 || scenario.correlation >= 1) throw new RangeError('correlation invalide.');
  if (![0, 1, 3, 12].includes(scenario.rebalanceEveryMonths)) throw new RangeError('rebalanceEveryMonths non supporté.');
  return true;
}

function correlatedNormals(random, count, correlation) {
  const common = standardNormal(random);
  const idiosyncraticScale = Math.sqrt(1 - correlation);
  const commonScale = Math.sqrt(correlation);
  return Array.from({ length: count }, () => commonScale * common + idiosyncraticScale * standardNormal(random));
}

function rebalanceHoldings(holdings, targetWeights) {
  const total = holdings.reduce((sum, value) => sum + value, 0);
  return targetWeights.map((weight) => total * weight);
}

export function simulateScenarioPathSet({ seed, paths, years, scenario, assumptions }) {
  validateScenario(scenario);
  if (!Number.isInteger(seed) || seed < 1) throw new RangeError('seed doit être un entier positif.');
  if (!Number.isInteger(paths) || paths < 1) throw new RangeError('paths doit être un entier positif.');
  if (!Number.isInteger(years) || years < 1) throw new RangeError('years doit être un entier positif.');

  const random = createRng(seed);
  const months = years * 12;
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const monthlyVolatility = assumptions.annualAssetVolatility / Math.sqrt(12);
  const finalValues = [];
  const drawdowns = [];
  const concentrationEnd = [];
  let aboveContributions = 0;

  for (let path = 0; path < paths; path += 1) {
    let holdings = scenario.targetWeights.map((weight) => assumptions.initialCapital * weight);
    let contributed = assumptions.initialCapital;
    let peak = assumptions.initialCapital;
    let maximumDrawdown = 0;

    for (let month = 1; month <= months; month += 1) {
      const contribution = assumptions.monthlyContribution;
      contributed += contribution;
      for (let index = 0; index < holdings.length; index += 1) holdings[index] += contribution * scenario.targetWeights[index];

      const shocks = correlatedNormals(random, scenario.assetCount, scenario.correlation);
      for (let index = 0; index < holdings.length; index += 1) {
        const grossReturn = Math.exp(monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * shocks[index]);
        holdings[index] *= grossReturn;
      }

      if (scenario.rebalanceEveryMonths > 0 && month % scenario.rebalanceEveryMonths === 0) {
        holdings = rebalanceHoldings(holdings, scenario.targetWeights);
      }

      const total = holdings.reduce((sum, value) => sum + value, 0);
      peak = Math.max(peak, total);
      maximumDrawdown = Math.max(maximumDrawdown, (peak - total) / peak);
    }

    const finalValue = holdings.reduce((sum, value) => sum + value, 0);
    const largestWeight = Math.max(...holdings.map((value) => value / finalValue));
    finalValues.push(finalValue);
    drawdowns.push(maximumDrawdown);
    concentrationEnd.push(largestWeight);
    if (finalValue >= contributed) aboveContributions += 1;
  }

  const percentiles = Object.freeze(Object.fromEntries([0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].map((p) => [`p${Math.round(p * 100)}`, quantile(finalValues, p)])));
  return Object.freeze({
    seed,
    scenarioId: scenario.id,
    years,
    paths,
    percentiles,
    drawdownMedian: quantile(drawdowns, 0.5),
    drawdownP90: quantile(drawdowns, 0.9),
    endingLargestWeightMedian: quantile(concentrationEnd, 0.5),
    probabilityAboveContributions: aboveContributions / paths
  });
}

function aggregate(rows) {
  const scalarKeys = ['drawdownMedian', 'drawdownP90', 'endingLargestWeightMedian', 'probabilityAboveContributions'];
  const scalars = Object.fromEntries(scalarKeys.map((key) => {
    const values = rows.map((row) => row[key]);
    return [key, Object.freeze({ median: quantile(values, 0.5), min: Math.min(...values), max: Math.max(...values) })];
  }));
  const percentiles = Object.fromEntries(['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'].map((key) => {
    const values = rows.map((row) => row.percentiles[key]);
    return [key, Object.freeze({ median: quantile(values, 0.5), min: Math.min(...values), max: Math.max(...values) })];
  }));
  return Object.freeze({ ...scalars, percentiles: Object.freeze(percentiles) });
}

export function runWeightingRebalancingCorrelationCampaign(config) {
  const replications = [];
  for (const scenario of config.scenarios) {
    validateScenario(scenario);
    for (const years of config.horizons) {
      for (const seed of config.seeds) {
        replications.push(simulateScenarioPathSet({ seed, paths: config.pathsPerReplication, years, scenario, assumptions: config.assumptions }));
      }
    }
  }
  const summary = [];
  for (const scenario of config.scenarios) {
    for (const years of config.horizons) {
      const rows = replications.filter((row) => row.scenarioId === scenario.id && row.years === years);
      summary.push(Object.freeze({ scenarioId: scenario.id, years, paths: rows.reduce((sum, row) => sum + row.paths, 0), replications: rows.length, metrics: aggregate(rows) }));
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    assumptions: Object.freeze({ ...config.assumptions }),
    scenarios: Object.freeze(config.scenarios.map((scenario) => Object.freeze({ ...scenario, targetWeights: Object.freeze([...scenario.targetWeights]) }))),
    seeds: Object.freeze([...config.seeds]),
    horizons: Object.freeze([...config.horizons]),
    pathsPerReplication: config.pathsPerReplication,
    totalPaths: replications.reduce((sum, row) => sum + row.paths, 0),
    summary: Object.freeze(summary),
    replications: Object.freeze(replications),
    limitations: Object.freeze([...config.limitations]),
    notice: 'Scenario comparison, not a forecast. No automatic IGL impact.'
  });
}
