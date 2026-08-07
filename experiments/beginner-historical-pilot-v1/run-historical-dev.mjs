import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from '../../validation/portfolioHistoricalMetrics.js';

const WINDOW = Object.freeze({ requestedStart: '2025-01-02', requestedEnd: '2026-01-02' });
const SOURCE = Object.freeze({ providerId: 'yahoo-finance-chart-dev', usage: 'development', validationEligibleSource: false });
const SYMBOLS = Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA' });
const PERIOD1 = 1735776000;
const PERIOD2 = 1767398400;

async function fetchAdjustedDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${PERIOD1}&period2=${PERIOD2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-historical-development-pilot/1.0' } });
  if (!response.ok) throw new Error(`source historique indisponible pour ${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) throw new Error(`réponse historique invalide pour ${symbol}`);
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(adjusted)) throw new Error(`adjusted close absent pour ${symbol}`);
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

export async function runHistoricalDevelopmentPilot() {
  const [wpea, paej] = await Promise.all([fetchAdjustedDaily(SYMBOLS.WPEA), fetchAdjustedDaily(SYMBOLS.PAEJ)]);
  const dates = commonDates(wpea, paej);
  if (dates.length < 2) throw new Error('moins de deux dates communes sur la fenêtre pilote');
  const startDate = dates[0];
  const endDate = dates.at(-1);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: 'beginner-historical-replay-dev-v1',
    initialCash: 10000,
    allocation: [
      { ticker: 'WPEA', weight: 0.50 },
      { ticker: 'PAEJ', weight: 0.15 },
      { ticker: 'CASH', weight: 0.35 }
    ],
    costPolicy: { transactionCostBps: 0 },
    seriesByTicker: { WPEA: wpea, PAEJ: paej, CASH: cash },
    startDate,
    endDate,
    contributions: [],
    rebalanceDates: []
  });
  const metrics = calculateReplayHistoricalMetrics(replay);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-historical-pilot-v1',
    status: 'development-historical-replay',
    source: SOURCE,
    symbols: SYMBOLS,
    requestedWindow: WINDOW,
    effectiveWindow: { startDate, endDate, commonObservationCount: dates.length },
    replay: {
      finalValue: replay.finalValue,
      totalCosts: replay.totalCosts,
      pnlVsContributions: replay.pnlVsContributions
    },
    metrics: {
      cumulativeReturn: metrics.cumulativeReturn,
      annualizedReturn: metrics.annualizedReturn,
      annualizedVolatility: metrics.annualizedVolatility,
      maxDrawdown: metrics.maxDrawdown,
      recovery: metrics.recovery,
      observationCount: metrics.observationCount,
      durationDays: metrics.durationDays
    },
    limitations: [
      'Yahoo Finance est utilisé uniquement comme source de développement et n’est pas déclaré validation-eligible.',
      'Le replay utilise des clôtures ajustées et zéro coût de transaction pour ce pilote.',
      'Aucun rééquilibrage n’est appliqué sur la fenêtre.',
      'Ce résultat ne constitue pas une validation scientifique finale.'
    ]
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runHistoricalDevelopmentPilot();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-historical-pilot-dev.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
