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

export const SHOCKS = Object.freeze({
  'income-loss-3': Object.freeze({ incomeLossMonths: 3, monthlyShortfall: 1200, oneOffExpense: 0 }),
  'income-loss-6': Object.freeze({ incomeLossMonths: 6, monthlyShortfall: 1200, oneOffExpense: 0 }),
  'expense-6000': Object.freeze({ incomeLossMonths: 0, monthlyShortfall: 0, oneOffExpense: 6000 }),
  combined: Object.freeze({ incomeLossMonths: 6, monthlyShortfall: 1200, oneOffExpense: 6000 })
});

function validateInput({ seed, paths, years, reserveMonths, shockId, assumptions }) {
  if (!Number.isInteger(seed) || seed < 1) throw new RangeError('seed doit être un entier positif.');
  if (!Number.isInteger(paths) || paths < 1) throw new RangeError('paths doit être un entier positif.');
  if (!Number.isInteger(years) || years < 1) throw new RangeError('years doit être un entier positif.');
  if (![0, 3, 6, 12].includes(reserveMonths)) throw new RangeError('reserveMonths non supporté.');
  if (!SHOCKS[shockId]) throw new RangeError('shockId non supporté.');
  for (const field of ['initialCapital', 'monthlyContribution', 'monthlyEssentialExpenses', 'annualGeometricReturn', 'annualVolatility', 'shockStartMonth']) {
    if (!Number.isFinite(assumptions[field])) throw new TypeError(`${field} doit être numérique.`);
  }
}

export function simulateResiliencePathSet({ seed, paths, years, reserveMonths, shockId, assumptions }) {
  validateInput({ seed, paths, years, reserveMonths, shockId, assumptions });
  const random = createRng(seed);
  const months = years * 12;
  const shock = SHOCKS[shockId];
  const monthlyDrift = Math.log(1 + assumptions.annualGeometricReturn) / 12;
  const monthlyVolatility = assumptions.annualVolatility / Math.sqrt(12);
  const initialReserve = reserveMonths * assumptions.monthlyEssentialExpenses;
  const finalValues = [];
  const drawdowns = [];
  const forcedWithdrawals = [];
  const recoveryMonths = [];
  let reserveDepletedCount = 0;
  let forcedWithdrawalCount = 0;

  for (let path = 0; path < paths; path += 1) {
    let portfolio = assumptions.initialCapital;
    let reserve = initialReserve;
    let peak = portfolio;
    let maxDrawdown = 0;
    let forcedWithdrawal = 0;
    let preShockPortfolio = null;
    let recoveredAt = null;

    for (let month = 1; month <= months; month += 1) {
      if (month === assumptions.shockStartMonth) preShockPortfolio = portfolio;
      let cashNeed = 0;
      const shockMonthIndex = month - assumptions.shockStartMonth;
      if (shockMonthIndex >= 0 && shockMonthIndex < shock.incomeLossMonths) cashNeed += shock.monthlyShortfall;
      if (month === assumptions.shockStartMonth) cashNeed += shock.oneOffExpense;

      if (cashNeed > 0) {
        const reserveUsed = Math.min(reserve, cashNeed);
        reserve -= reserveUsed;
        const residual = cashNeed - reserveUsed;
        if (residual > 0) {
          const withdrawn = Math.min(portfolio, residual);
          portfolio -= withdrawn;
          forcedWithdrawal += withdrawn;
        }
      }

      const contributionSuspended = shockMonthIndex >= 0 && shockMonthIndex < shock.incomeLossMonths;
      if (!contributionSuspended) portfolio += assumptions.monthlyContribution;

      const monthlyReturn = Math.exp(monthlyDrift - 0.5 * monthlyVolatility ** 2 + monthlyVolatility * standardNormal(random));
      portfolio *= monthlyReturn;
      peak = Math.max(peak, portfolio);
      maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - portfolio) / peak : 1);

      if (preShockPortfolio !== null && recoveredAt === null && portfolio >= preShockPortfolio) {
        recoveredAt = month - assumptions.shockStartMonth + 1;
      }
    }

    finalValues.push(portfolio);
    drawdowns.push(maxDrawdown);
    forcedWithdrawals.push(forcedWithdrawal);
    if (reserve === 0 && initialReserve > 0) reserveDepletedCount += 1;
    if (forcedWithdrawal > 0) forcedWithdrawalCount += 1;
    if (recoveredAt !== null) recoveryMonths.push(recoveredAt);
  }

  const percentiles = Object.freeze(Object.fromEntries([0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].map((p) => [`p${Math.round(p * 100)}`, quantile(finalValues, p)])));
  return Object.freeze({
    seed,
    years,
    reserveMonths,
    shockId,
    paths,
    percentiles,
    drawdownMedian: quantile(drawdowns, 0.5),
    drawdownP90: quantile(drawdowns, 0.9),
    forcedWithdrawalProbability: forcedWithdrawalCount / paths,
    forcedWithdrawalMedian: quantile(forcedWithdrawals, 0.5),
    reserveDepletionProbability: initialReserve === 0 ? 1 : reserveDepletedCount / paths,
    recoveryProbability: recoveryMonths.length / paths,
    recoveryMonthsMedian: recoveryMonths.length ? quantile(recoveryMonths, 0.5) : null
  });
}

function aggregate(rows) {
  const scalarKeys = ['drawdownMedian', 'drawdownP90', 'forcedWithdrawalProbability', 'forcedWithdrawalMedian', 'reserveDepletionProbability', 'recoveryProbability', 'recoveryMonthsMedian'];
  const scalars = Object.fromEntries(scalarKeys.map((key) => {
    const values = rows.map((row) => row[key]).filter((value) => value !== null);
    return [key, values.length ? Object.freeze({ median: quantile(values, 0.5), min: Math.min(...values), max: Math.max(...values) }) : null];
  }));
  const percentiles = Object.fromEntries(['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'].map((key) => {
    const values = rows.map((row) => row.percentiles[key]);
    return [key, Object.freeze({ median: quantile(values, 0.5), min: Math.min(...values), max: Math.max(...values) })];
  }));
  return Object.freeze({ ...scalars, percentiles: Object.freeze(percentiles) });
}

export function runFinancialResilienceCampaign(config) {
  const replications = [];
  for (const shockId of config.shockIds) {
    for (const reserveMonths of config.reserveMonths) {
      for (const years of config.horizons) {
        for (const seed of config.seeds) {
          replications.push(simulateResiliencePathSet({ seed, paths: config.pathsPerReplication, years, reserveMonths, shockId, assumptions: config.assumptions }));
        }
      }
    }
  }
  const summary = [];
  for (const shockId of config.shockIds) {
    for (const reserveMonths of config.reserveMonths) {
      for (const years of config.horizons) {
        const rows = replications.filter((row) => row.shockId === shockId && row.reserveMonths === reserveMonths && row.years === years);
        summary.push(Object.freeze({ shockId, reserveMonths, years, paths: rows.reduce((sum, row) => sum + row.paths, 0), replications: rows.length, metrics: aggregate(rows) }));
      }
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: config.campaignId,
    model: Object.freeze({ ...config.assumptions, distribution: 'independent-lognormal-monthly-returns', notice: 'Scenario comparison, not a forecast.' }),
    seeds: Object.freeze([...config.seeds]),
    horizons: Object.freeze([...config.horizons]),
    reserveMonths: Object.freeze([...config.reserveMonths]),
    shockIds: Object.freeze([...config.shockIds]),
    pathsPerReplication: config.pathsPerReplication,
    totalPaths: replications.reduce((sum, row) => sum + row.paths, 0),
    summary: Object.freeze(summary),
    replications: Object.freeze(replications),
    limitations: Object.freeze([...config.limitations])
  });
}
