import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics, calculateReplayMonthlyMatchedMetrics } from '../../validation/portfolioHistoricalMetrics.js';

const QUARTERS = Object.freeze([
  ['2024-Q2', '2024-04-01', '2024-06-30'],
  ['2024-Q3', '2024-07-01', '2024-09-30'],
  ['2024-Q4', '2024-10-01', '2024-12-31'],
  ['2025-Q1', '2025-01-01', '2025-03-31'],
  ['2025-Q2', '2025-04-01', '2025-06-30'],
  ['2025-Q3', '2025-07-01', '2025-09-30'],
  ['2025-Q4', '2025-10-01', '2025-12-31'],
  ['2026-Q1', '2026-01-01', '2026-03-31']
].map(([id, requestedStart, requestedEnd]) => Object.freeze({ id, requestedStart, requestedEnd })));

const SYMBOLS = Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA' });

function unixSeconds(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
}

async function fetchAdjustedDaily(symbol, startDate, endDate) {
  const period1 = unixSeconds(startDate);
  const period2 = unixSeconds(endDate) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-exact-quarterly-development-pilot/1.0' } });
  if (!response.ok) throw new Error(`source historique indisponible pour ${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`réponse historique invalide pour ${symbol}`);
  return result.timestamp.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    availableAt: new Date(timestamp * 1000).toISOString().slice(0, 10),
    price: adjusted[index]
  })).filter(point => Number.isFinite(point.price));
}

function commonDates(a, b) {
  const bDates = new Set(b.map(point => point.date));
  return a.map(point => point.date).filter(date => bDates.has(date)).sort();
}

async function runQuarter(quarter) {
  const [wpea, paej] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.WPEA, quarter.requestedStart, quarter.requestedEnd),
    fetchAdjustedDaily(SYMBOLS.PAEJ, quarter.requestedStart, quarter.requestedEnd)
  ]);
  const dates = commonDates(wpea, paej);
  if (dates.length < 2) throw new Error(`${quarter.id}: moins de deux dates communes`);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: `beginner-exact-${quarter.id}-dev-v1`,
    initialCash: 10000,
    allocation: [
      { ticker: 'WPEA', weight: 0.50 },
      { ticker: 'PAEJ', weight: 0.15 },
      { ticker: 'CASH', weight: 0.35 }
    ],
    costPolicy: { transactionCostBps: 0 },
    seriesByTicker: { WPEA: wpea, PAEJ: paej, CASH: cash },
    startDate: dates[0],
    endDate: dates.at(-1),
    contributions: [],
    rebalanceDates: []
  });
  const metrics = calculateReplayHistoricalMetrics(replay);
  const monthlyMatched = calculateReplayMonthlyMatchedMetrics(replay);
  return Object.freeze({
    id: quarter.id,
    requestedWindow: { startDate: quarter.requestedStart, endDate: quarter.requestedEnd },
    effectiveWindow: { startDate: dates[0], endDate: dates.at(-1), commonObservationCount: dates.length },
    finalValue: replay.finalValue,
    cumulativeReturn: metrics.cumulativeReturn,
    annualizedReturn: metrics.annualizedReturn,
    annualizedVolatility: metrics.annualizedVolatility,
    maxDrawdown: metrics.maxDrawdown,
    maxDrawdownDaily: metrics.maxDrawdown,
    maxDrawdownMonthlyMatched: monthlyMatched.maxDrawdown,
    drawdownComparisonFrequency: 'monthly',
    recovery: metrics.recovery,
    monthlyMatchedRecovery: monthlyMatched.recovery,
    durationDays: metrics.durationDays
  });
}

export async function runExactQuarterlyDevelopmentPilot() {
  const windows = [];
  for (const quarter of QUARTERS) windows.push(await runQuarter(quarter));
  return Object.freeze({
    schemaVersion: 2,
    experimentId: 'beginner-exact-quarterly-dev-v1',
    status: 'development-historical-replay',
    track: 'exact',
    source: Object.freeze({ providerId: 'yahoo-finance-chart-dev', usage: 'development', validationEligibleSource: false }),
    instruments: Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA', CASH: 'synthetic-cash-1' }),
    allocation: Object.freeze({ WPEA: 0.50, PAEJ: 0.15, CASH: 0.35 }),
    windows: Object.freeze(windows),
    limitations: Object.freeze([
      'Les fenêtres demandées sont non chevauchantes et appartiennent à la piste instrument exact.',
      'La source Yahoo Finance reste development-only et n’est pas validation-eligible.',
      'Le drawdown quotidien est conservé comme mesure de risque haute fréquence ; seul le drawdown mensuel apparié est comparable aux percentiles du moteur mensuel.',
      'Aucun coût, apport ou rééquilibrage n’est appliqué dans ce pilote.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runExactQuarterlyDevelopmentPilot();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-exact-quarterly-dev.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
