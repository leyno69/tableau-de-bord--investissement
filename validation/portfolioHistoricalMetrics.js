const MS_PER_DAY = 86400000;

export const HISTORICAL_METRIC_CONVENTIONS = Object.freeze({
  schemaVersion: 1,
  returnMethod: 'time-weighted-flow-adjusted',
  annualizationCalendarDays: 365.2425,
  volatilityPeriodsPerYear: 252,
  volatilityEstimator: 'sample-standard-deviation',
  drawdownBasis: 'flow-adjusted-wealth-index',
  recoveryBasis: 'calendar-days'
});

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function positive(value, field) {
  const number = finite(value, field);
  if (number <= 0) throw new TypeError(`${field} doit être strictement positif.`);
  return number;
}

function dateOnly(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new TypeError(`${field} doit être une date ISO YYYY-MM-DD.`);
  }
  return value;
}

function calendarDays(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

function normalizeValuePath(valuePath) {
  if (!Array.isArray(valuePath) || valuePath.length < 2) throw new TypeError('valuePath doit contenir au moins deux valorisations.');
  let previousDate = null;
  return valuePath.map((point, index) => {
    const date = dateOnly(point.date, `valuePath[${index}].date`);
    if (previousDate && date <= previousDate) throw new TypeError('les dates de valuePath doivent être strictement croissantes.');
    previousDate = date;
    return Object.freeze({
      date,
      value: positive(point.value, `valuePath[${index}].value`),
      externalFlow: finite(point.externalFlow ?? 0, `valuePath[${index}].externalFlow`)
    });
  });
}

function sampleStd(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function buildWealthPath(points, openingCapital) {
  const firstWealth = points[0].value / openingCapital;
  if (!(firstWealth > 0)) throw new TypeError('la valorisation initiale ajustée doit rester positive.');
  const wealthPath = [{ date: points[0].date, wealthIndex: firstWealth, periodReturn: null }];
  const returns = [];
  let wealth = firstWealth;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const adjustedEndingValue = current.value - current.externalFlow;
    if (!(adjustedEndingValue > 0)) throw new TypeError(`la valeur ajustée des flux doit rester positive au ${current.date}.`);
    const periodReturn = adjustedEndingValue / previous.value - 1;
    if (!(periodReturn > -1)) throw new TypeError(`rendement de période invalide au ${current.date}.`);
    returns.push(periodReturn);
    wealth *= 1 + periodReturn;
    wealthPath.push({ date: current.date, wealthIndex: wealth, periodReturn });
  }
  return { wealthPath, returns };
}

function analyzeDrawdown(wealthPath) {
  let peakValue = wealthPath[0].wealthIndex;
  let peakDate = wealthPath[0].date;
  let maxDrawdown = 0;
  let drawdownPeakDate = peakDate;
  let troughDate = peakDate;
  let recoveryDate = null;
  let targetPeak = peakValue;
  let activeMaxDrawdown = false;

  for (const point of wealthPath) {
    if (point.wealthIndex >= peakValue) {
      peakValue = point.wealthIndex;
      peakDate = point.date;
    }
    const drawdown = point.wealthIndex / peakValue - 1;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      drawdownPeakDate = peakDate;
      troughDate = point.date;
      targetPeak = peakValue;
      recoveryDate = null;
      activeMaxDrawdown = true;
    } else if (activeMaxDrawdown && recoveryDate == null && point.date > troughDate && point.wealthIndex >= targetPeak) {
      recoveryDate = point.date;
      activeMaxDrawdown = false;
    }
  }

  const recovered = maxDrawdown === 0 || recoveryDate !== null;
  return Object.freeze({
    maxDrawdown,
    peakDate: drawdownPeakDate,
    troughDate,
    recovered,
    recoveryDate,
    recoveryDaysFromTrough: recoveryDate ? calendarDays(troughDate, recoveryDate) : null,
    underwaterDays: recoveryDate ? calendarDays(drawdownPeakDate, recoveryDate) : null
  });
}

export function resampleValuePathMonthly(valuePath) {
  const points = normalizeValuePath(valuePath);
  const first = points[0];
  const byMonth = new Map();
  const flowByMonth = new Map();
  for (const point of points.slice(1)) {
    const month = point.date.slice(0, 7);
    byMonth.set(month, point);
    flowByMonth.set(month, (flowByMonth.get(month) ?? 0) + point.externalFlow);
  }
  const sampled = [Object.freeze({ ...first })];
  for (const [month, point] of [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (point.date === first.date) continue;
    sampled.push(Object.freeze({ date: point.date, value: point.value, externalFlow: flowByMonth.get(month) ?? 0 }));
  }
  if (sampled.length < 2) throw new TypeError('la trajectoire mensuelle doit contenir au moins deux valorisations.');
  return Object.freeze(sampled);
}

export function calculateHistoricalMetrics({ valuePath, openingCapital }) {
  const points = normalizeValuePath(valuePath);
  const initialCapital = positive(openingCapital, 'openingCapital');
  const { wealthPath, returns } = buildWealthPath(points, initialCapital);
  const cumulativeReturn = wealthPath.at(-1).wealthIndex - 1;
  const durationDays = calendarDays(points[0].date, points.at(-1).date);
  const annualizedReturn = durationDays > 0
    ? Math.pow(1 + cumulativeReturn, HISTORICAL_METRIC_CONVENTIONS.annualizationCalendarDays / durationDays) - 1
    : null;
  const dailyStd = sampleStd(returns);
  const annualizedVolatility = dailyStd == null ? null : dailyStd * Math.sqrt(HISTORICAL_METRIC_CONVENTIONS.volatilityPeriodsPerYear);
  const drawdown = analyzeDrawdown(wealthPath);

  return Object.freeze({
    schemaVersion: 1,
    observationCount: points.length,
    periodReturnCount: returns.length,
    startDate: points[0].date,
    endDate: points.at(-1).date,
    durationDays,
    cumulativeReturn,
    annualizedReturn,
    annualizedVolatility,
    maxDrawdown: drawdown.maxDrawdown,
    recovery: drawdown,
    periodReturns: Object.freeze([...returns]),
    wealthPath: Object.freeze(wealthPath.map(point => Object.freeze({ ...point }))),
    conventions: HISTORICAL_METRIC_CONVENTIONS
  });
}

export function calculateReplayHistoricalMetrics(replay) {
  if (!replay || typeof replay !== 'object' || !Array.isArray(replay.valuePath)) throw new TypeError('replay doit exposer valuePath.');
  const firstDateFlow = Number(replay.valuePath[0]?.externalFlow ?? 0);
  const openingCapital = positive(replay.initialCash, 'replay.initialCash') + finite(firstDateFlow, 'firstDateFlow');
  return calculateHistoricalMetrics({ valuePath: replay.valuePath, openingCapital });
}

export function calculateReplayMonthlyMatchedMetrics(replay) {
  if (!replay || typeof replay !== 'object' || !Array.isArray(replay.valuePath)) throw new TypeError('replay doit exposer valuePath.');
  const firstDateFlow = Number(replay.valuePath[0]?.externalFlow ?? 0);
  const openingCapital = positive(replay.initialCash, 'replay.initialCash') + finite(firstDateFlow, 'firstDateFlow');
  const monthlyValuePath = resampleValuePathMonthly(replay.valuePath);
  const metrics = calculateHistoricalMetrics({ valuePath: monthlyValuePath, openingCapital });
  return Object.freeze({ ...metrics, samplingFrequency: 'monthly', sourceObservationCount: replay.valuePath.length });
}
