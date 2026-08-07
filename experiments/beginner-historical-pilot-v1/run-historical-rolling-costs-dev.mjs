import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from '../../validation/portfolioHistoricalMetrics.js';

const WINDOWS = Object.freeze([
  Object.freeze({ id: '2024q2', requestedStart: '2024-04-01', requestedEnd: '2025-03-31', period1: 1711929600, period2: 1743465600 }),
  Object.freeze({ id: '2024q3', requestedStart: '2024-07-01', requestedEnd: '2025-06-30', period1: 1719792000, period2: 1751328000 }),
  Object.freeze({ id: '2024q4', requestedStart: '2024-10-01', requestedEnd: '2025-09-30', period1: 1727740800, period2: 1759276800 }),
  Object.freeze({ id: '2025q1', requestedStart: '2025-01-02', requestedEnd: '2026-01-02', period1: 1735776000, period2: 1767312000 }),
  Object.freeze({ id: '2025q2', requestedStart: '2025-04-01', requestedEnd: '2026-03-31', period1: 1743465600, period2: 1775001600 }),
  Object.freeze({ id: '2025q3', requestedStart: '2025-07-01', requestedEnd: '2026-06-30', period1: 1751328000, period2: 1782864000 })
]);
const COST_LEVELS_BPS = Object.freeze([0, 10, 25, 50]);
const SYMBOLS = Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA' });
const ALLOCATION = Object.freeze([
  Object.freeze({ ticker: 'WPEA', weight: 0.50 }),
  Object.freeze({ ticker: 'PAEJ', weight: 0.15 }),
  Object.freeze({ ticker: 'CASH', weight: 0.35 })
]);

async function fetchAdjustedDaily(symbol, period1, period2) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-historical-development-pilot/1.0' } });
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

function summarize(replay) {
  const metrics = calculateReplayHistoricalMetrics(replay);
  return Object.freeze({
    finalValue: replay.finalValue,
    totalCosts: replay.totalCosts,
    cumulativeReturn: metrics.cumulativeReturn,
    annualizedReturn: metrics.annualizedReturn,
    annualizedVolatility: metrics.annualizedVolatility,
    maxDrawdown: metrics.maxDrawdown,
    recovered: metrics.recovery.recovered,
    recoveryDaysFromTrough: metrics.recovery.recoveryDaysFromTrough
  });
}

async function runWindow(window) {
  const [wpea, paej] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.WPEA, window.period1, window.period2),
    fetchAdjustedDaily(SYMBOLS.PAEJ, window.period1, window.period2)
  ]);
  const dates = commonDates(wpea, paej);
  if (dates.length < 2) throw new Error(`fenêtre ${window.id}: moins de deux dates communes`);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const scenarios = [];
  for (const transactionCostBps of COST_LEVELS_BPS) {
    const replay = runHistoricalReplay({
      replayId: `beginner-${window.id}-${transactionCostBps}bps-dev-v1`,
      initialCash: 10000,
      allocation: ALLOCATION,
      costPolicy: { transactionCostBps, exemptTickers: ['CASH'] },
      seriesByTicker: { WPEA: wpea, PAEJ: paej, CASH: cash },
      startDate: dates[0],
      endDate: dates.at(-1),
      contributions: [],
      rebalanceDates: []
    });
    scenarios.push(Object.freeze({ transactionCostBps, ...summarize(replay) }));
  }
  const zero = scenarios.find(item => item.transactionCostBps === 0);
  return Object.freeze({
    id: window.id,
    requestedWindow: { requestedStart: window.requestedStart, requestedEnd: window.requestedEnd },
    effectiveWindow: { startDate: dates[0], endDate: dates.at(-1), commonObservationCount: dates.length },
    zeroCost: zero,
    costSensitivity: Object.freeze(scenarios),
    maxReturnDragVsZero: Math.max(...scenarios.map(item => zero.cumulativeReturn - item.cumulativeReturn))
  });
}

export async function runRollingCostHistoricalDevelopmentPilot() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await runWindow(window));
  const zeroCostReturns = windows.map(window => window.zeroCost.cumulativeReturn);
  const zeroCostDrawdowns = windows.map(window => window.zeroCost.maxDrawdown);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-historical-rolling-costs-dev-v1',
    status: 'development-historical-replay',
    source: { providerId: 'yahoo-finance-chart-dev', usage: 'development', validationEligibleSource: false },
    allocation: ALLOCATION,
    costPolicy: { testedTransactionCostBps: COST_LEVELS_BPS, exemptTickers: ['CASH'] },
    windows: Object.freeze(windows),
    crossWindowSummary: Object.freeze({
      windowCount: windows.length,
      minZeroCostReturn: Math.min(...zeroCostReturns),
      maxZeroCostReturn: Math.max(...zeroCostReturns),
      minZeroCostDrawdown: Math.min(...zeroCostDrawdowns),
      maxZeroCostDrawdown: Math.max(...zeroCostDrawdowns)
    }),
    limitations: Object.freeze([
      'Les fenêtres glissantes se chevauchent et ne sont donc pas statistiquement indépendantes.',
      'Yahoo Finance reste une source de développement et non une source de validation scientifique finale.',
      'Les frais testés sont des coûts de transaction à l’entrée uniquement dans ces scénarios sans rééquilibrage.',
      'CASH est explicitement exempt de coûts de transaction.',
      'Aucun impôt, spread dynamique ou slippage n’est modélisé.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runRollingCostHistoricalDevelopmentPilot();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-historical-rolling-costs-dev.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
