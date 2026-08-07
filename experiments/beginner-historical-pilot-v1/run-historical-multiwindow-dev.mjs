import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from '../../validation/portfolioHistoricalMetrics.js';

const WINDOWS = Object.freeze([
  Object.freeze({ id: 'window-a', requestedStart: '2024-04-01', requestedEnd: '2025-03-31', period1: 1711929600, period2: 1743465600 }),
  Object.freeze({ id: 'window-b', requestedStart: '2025-04-01', requestedEnd: '2026-03-31', period1: 1743465600, period2: 1775001600 })
]);
const SYMBOLS = Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA' });

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

async function runWindow(window) {
  const [wpea, paej] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.WPEA, window.period1, window.period2),
    fetchAdjustedDaily(SYMBOLS.PAEJ, window.period1, window.period2)
  ]);
  const dates = commonDates(wpea, paej);
  if (dates.length < 2) throw new Error(`fenêtre ${window.id}: moins de deux dates communes`);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: `beginner-historical-${window.id}-dev-v1`,
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
  return Object.freeze({
    id: window.id,
    requestedWindow: { requestedStart: window.requestedStart, requestedEnd: window.requestedEnd },
    effectiveWindow: { startDate: dates[0], endDate: dates.at(-1), commonObservationCount: dates.length },
    finalValue: replay.finalValue,
    cumulativeReturn: metrics.cumulativeReturn,
    annualizedReturn: metrics.annualizedReturn,
    annualizedVolatility: metrics.annualizedVolatility,
    maxDrawdown: metrics.maxDrawdown,
    recovery: metrics.recovery,
    durationDays: metrics.durationDays
  });
}

export async function runMultiwindowHistoricalDevelopmentPilot() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await runWindow(window));
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-historical-multiwindow-dev-v1',
    status: 'development-historical-replay',
    source: { providerId: 'yahoo-finance-chart-dev', usage: 'development', validationEligibleSource: false },
    symbols: SYMBOLS,
    windows: Object.freeze(windows),
    limitations: Object.freeze([
      'Les deux fenêtres sont non chevauchantes au niveau des dates demandées mais utilisent la même source de développement.',
      'Yahoo Finance n’est pas déclaré validation-eligible.',
      'Zéro frais et aucun rééquilibrage dans ce pilote.',
      'Deux fenêtres ne suffisent pas à valider scientifiquement le modèle.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runMultiwindowHistoricalDevelopmentPilot();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-historical-multiwindow-dev.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
