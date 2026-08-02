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
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('values doit être non vide.');
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * probability;
  const lower = Math.floor(position);
  const fraction = position - lower;
  const a = ordered[lower];
  const b = ordered[lower + 1] ?? a;
  return a + (b - a) * fraction;
}

export function computePortfolioVolatility({ lineCount, assetVolatility, correlation }) {
  if (!Number.isInteger(lineCount) || lineCount < 1) throw new RangeError('lineCount invalide.');
  if (!(assetVolatility > 0)) throw new RangeError('assetVolatility invalide.');
  if (!(correlation >= 0 && correlation <= 1)) throw new RangeError('correlation invalide.');
  return assetVolatility * Math.sqrt((1 + (lineCount - 1) * correlation) / lineCount);
}

export function simulateFactorialCell({ seed, paths, years, behavior, reserveMonths, lineCount, assetVolatility, assumptions }) {
  const random = createRng(seed);
  const monthlyVolatility = computePortfolioVolatility({ lineCount, assetVolatility, correlation: assumptions.correlation }) / Math.sqrt(12);
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const finalValues = [];
  const drawdowns = [];
  const forcedWithdrawals = [];

  for (let path = 0; path < paths; path += 1) {
    let value = assumptions.initialCapital;
    let reserve = reserveMonths * assumptions.monthlyContribution;
    let peak = value;
    let maximumDrawdown = 0;
    let forcedWithdrawal = 0;

    for (let month = 1; month <= years * 12; month += 1) {
      const interrupted = behavior === 'interruption' && month >= 25 && month <= 36;
      const contribution = interrupted ? 0 : assumptions.monthlyContribution;
      const shock = interrupted ? assumptions.monthlyContribution : 0;
      const reserveUse = Math.min(reserve, shock);
      reserve -= reserveUse;
      const remainingShock = shock - reserveUse;
      if (remainingShock > 0) {
        const withdrawal = Math.min(value, remainingShock);
        value -= withdrawal;
        forcedWithdrawal += withdrawal;
      }
      value += contribution;
      const grossReturn = Math.exp(monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * standardNormal(random));
      value *= grossReturn;
      peak = Math.max(peak, value);
      maximumDrawdown = Math.max(maximumDrawdown, (peak - value) / peak);
    }

    finalValues.push(value);
    drawdowns.push(maximumDrawdown);
    forcedWithdrawals.push(forcedWithdrawal);
  }

  return Object.freeze({
    seed, paths, years, behavior, reserveMonths, lineCount, assetVolatility,
    finalP10: quantile(finalValues, 0.1),
    finalMedian: quantile(finalValues, 0.5),
    finalP90: quantile(finalValues, 0.9),
    drawdownMedian: quantile(drawdowns, 0.5),
    forcedWithdrawalMedian: quantile(forcedWithdrawals, 0.5)
  });
}

export function runFactorialPilot(config) {
  const replications = [];
  for (const behavior of config.behaviors)
    for (const reserveMonths of config.reserveMonths)
      for (const lineCount of config.lineCounts)
        for (const assetVolatility of config.assetVolatilities)
          for (const years of config.horizons)
            for (const seed of config.seeds)
              replications.push(simulateFactorialCell({
                seed: seed + years * 1000 + lineCount * 17 + Math.round(assetVolatility * 1000) + reserveMonths * 11 + (behavior === 'interruption' ? 99991 : 0),
                paths: config.pathsPerReplication,
                years, behavior, reserveMonths, lineCount, assetVolatility,
                assumptions: config.assumptions
              }));

  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    totalPaths: replications.reduce((total, row) => total + row.paths, 0),
    factors: Object.freeze({
      behaviors: Object.freeze([...config.behaviors]),
      reserveMonths: Object.freeze([...config.reserveMonths]),
      lineCounts: Object.freeze([...config.lineCounts]),
      assetVolatilities: Object.freeze([...config.assetVolatilities]),
      horizons: Object.freeze([...config.horizons]),
      seeds: Object.freeze([...config.seeds])
    }),
    replications: Object.freeze(replications),
    limitations: Object.freeze([...config.limitations]),
    notice: 'Scenario comparison, not a forecast.'
  });
}
