import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from '../../validation/portfolioHistoricalMetrics.js';
import { BEGINNER_ETF_PROXY_POLICY_V1 } from '../../validation/etfProxyValidationPolicy.js';

const WINDOWS = Object.freeze([
  Object.freeze({ id: '2015', start: '2015-01-02', end: '2015-12-31' }),
  Object.freeze({ id: '2018', start: '2018-01-02', end: '2018-12-31' }),
  Object.freeze({ id: '2020', start: '2020-01-02', end: '2020-12-31' }),
  Object.freeze({ id: '2022', start: '2022-01-03', end: '2022-12-30' }),
  Object.freeze({ id: '2023', start: '2023-01-02', end: '2023-12-29' })
]);

const SYMBOLS = Object.freeze({ WPEA_PROXY: 'IWDA.AS', PAEJ: 'PAEJ.PA' });
const ALLOCATION = Object.freeze([
  Object.freeze({ ticker: 'WPEA_PROXY', weight: 0.50 }),
  Object.freeze({ ticker: 'PAEJ', weight: 0.15 }),
  Object.freeze({ ticker: 'CASH', weight: 0.35 })
]);

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol, start, end) {
  const period1 = unix(start);
  const period2 = unix(end) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-etf-proxy-validation/1.0' } });
  if (!response.ok) throw new Error(`source indisponible pour ${symbol}: HTTP ${response.status}`);
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

function metricsSummary(replay) {
  const metrics = calculateReplayHistoricalMetrics(replay);
  return Object.freeze({
    finalValue: replay.finalValue,
    cumulativeReturn: metrics.cumulativeReturn,
    annualizedReturn: metrics.annualizedReturn,
    annualizedVolatility: metrics.annualizedVolatility,
    maxDrawdown: metrics.maxDrawdown,
    recovered: metrics.recovery.recovered,
    recoveryDaysFromTrough: metrics.recovery.recoveryDaysFromTrough
  });
}

async function runWindow(window) {
  const [worldProxy, paej] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.WPEA_PROXY, window.start, window.end),
    fetchAdjustedDaily(SYMBOLS.PAEJ, window.start, window.end)
  ]);
  const dates = commonDates(worldProxy, paej);
  if (dates.length < 200) throw new Error(`${window.id}: couverture insuffisante (${dates.length} observations communes)`);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: `beginner-etf-proxy-${window.id}-v1`,
    initialCash: 10000,
    allocation: ALLOCATION,
    costPolicy: { transactionCostBps: 0, exemptTickers: ['CASH'] },
    seriesByTicker: { WPEA_PROXY: worldProxy, PAEJ: paej, CASH: cash },
    startDate: dates[0],
    endDate: dates.at(-1),
    contributions: [],
    rebalanceDates: []
  });
  return Object.freeze({
    id: window.id,
    requestedWindow: window,
    effectiveWindow: Object.freeze({ startDate: dates[0], endDate: dates.at(-1), commonObservationCount: dates.length }),
    metrics: metricsSummary(replay)
  });
}

export async function runBeginnerEtfProxyValidationV1() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await runWindow(window));
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-etf-proxy-validation-v1',
    status: BEGINNER_ETF_PROXY_POLICY_V1.status,
    evidenceTier: BEGINNER_ETF_PROXY_POLICY_V1.evidenceTier,
    source: Object.freeze({ provider: 'Yahoo Finance chart API', usage: 'public-market-history', licensedBenchmarkSource: false }),
    proxyPolicyId: BEGINNER_ETF_PROXY_POLICY_V1.policyId,
    allocation: ALLOCATION,
    windows: Object.freeze(windows),
    limitations: Object.freeze([
      'IWDA.AS est un proxy ETF explicite de WPEA, pas son historique réel avant 2024.',
      'Les prix publics Yahoo ne constituent pas une série MSCI officielle licenciée.',
      'Cette piste apporte une preuve empirique de robustesse, pas une validation officielle du benchmark MSCI.',
      'Les fenêtres sont distinctes dans le temps mais ne sont pas assimilées à des tirages iid.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runBeginnerEtfProxyValidationV1();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-etf-proxy-validation-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
