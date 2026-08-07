import { mkdir, writeFile } from 'node:fs/promises';
import { classifyDrawdownAgainstSimulation, describeReturnTailRisk, pearsonCorrelation } from '../../validation/historicalRiskDiagnostics.js';
import proxyResults from './results.json' with { type: 'json' };
import pilotResults from '../beginner-historical-pilot-v1/results.json' with { type: 'json' };

const WINDOWS = Object.freeze([
  Object.freeze({ id: '2015', start: '2015-01-02', end: '2015-12-31' }),
  Object.freeze({ id: '2018', start: '2018-01-02', end: '2018-12-31' }),
  Object.freeze({ id: '2020', start: '2020-01-02', end: '2020-12-31' }),
  Object.freeze({ id: '2022', start: '2022-01-03', end: '2022-12-30' }),
  Object.freeze({ id: '2023', start: '2023-01-02', end: '2023-12-29' })
]);
const SYMBOLS = Object.freeze({ world: 'IWDA.AS', asia: 'PAEJ.PA' });
const WEIGHTS = Object.freeze({ world: 0.50, asia: 0.15, cash: 0.35 });

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end) + 86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-risk-diagnostics/1.0' } });
  if (!response.ok) throw new Error(`source indisponible pour ${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`réponse invalide pour ${symbol}`);
  return result.timestamp.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    price: adjusted[index]
  })).filter(point => Number.isFinite(point.price));
}

function commonSeries(left, right) {
  const rightByDate = new Map(right.map(point => [point.date, point.price]));
  return left.filter(point => rightByDate.has(point.date)).map(point => ({
    date: point.date,
    worldPrice: point.price,
    asiaPrice: rightByDate.get(point.date)
  }));
}

function simpleReturns(values) {
  return values.slice(1).map((value, index) => value / values[index] - 1);
}

function portfolioPath(rows) {
  const first = rows[0];
  const worldShares = WEIGHTS.world / first.worldPrice;
  const asiaShares = WEIGHTS.asia / first.asiaPrice;
  return rows.map(row => ({
    date: row.date,
    value: worldShares * row.worldPrice + asiaShares * row.asiaPrice + WEIGHTS.cash
  }));
}

function monthEnds(path) {
  const byMonth = new Map();
  for (const point of path) byMonth.set(point.date.slice(0, 7), point);
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function monthlyReturns(path) {
  const ends = monthEnds(path);
  if (ends.length < 2) return [];
  return simpleReturns(ends.map(point => point.value));
}

async function analyzeWindow(window) {
  const [world, asia] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.world, window.start, window.end),
    fetchAdjustedDaily(SYMBOLS.asia, window.start, window.end)
  ]);
  const rows = commonSeries(world, asia);
  if (rows.length < 200) throw new Error(`${window.id}: couverture insuffisante`);
  const worldReturns = simpleReturns(rows.map(row => row.worldPrice));
  const asiaReturns = simpleReturns(rows.map(row => row.asiaPrice));
  const monthly = monthlyReturns(portfolioPath(rows));
  const historical = proxyResults.windows.find(item => item.id === window.id);
  if (!historical) throw new Error(`${window.id}: résultat proxy absent`);
  return Object.freeze({
    id: window.id,
    observationCount: rows.length,
    monthlyReturns: monthly,
    assetDailyCorrelation: pearsonCorrelation(worldReturns, asiaReturns),
    drawdownComparison: classifyDrawdownAgainstSimulation(Math.abs(historical.metrics.maxDrawdown), pilotResults.summary.drawdown)
  });
}

export async function runBeginnerRiskDiagnosticsV1() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await analyzeWindow(window));
  const combinedMonthlyReturns = windows.flatMap(window => window.monthlyReturns);
  const referenceMonthlyMean = Math.pow(1 + pilotResults.definition.annualReturn, 1 / 12) - 1;
  const referenceMonthlyVolatility = pilotResults.definition.annualVolatility / Math.sqrt(12);
  const tailRisk = describeReturnTailRisk(combinedMonthlyReturns, { referenceMonthlyMean, referenceMonthlyVolatility });
  const correlations = windows.map(window => window.assetDailyCorrelation).filter(Number.isFinite);
  const adverseWindows = windows.filter(window => window.drawdownComparison.adverseEvidence).map(window => window.id);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-drawdown-risk-diagnostics-v1',
    status: 'descriptive-diagnostics',
    modelUnderTest: Object.freeze({
      annualReturn: pilotResults.definition.annualReturn,
      annualVolatility: pilotResults.definition.annualVolatility,
      distribution: 'monthly-gaussian-aggregate',
      explicitAssetCorrelation: false
    }),
    windows: Object.freeze(windows.map(window => Object.freeze({
      id: window.id,
      observationCount: window.observationCount,
      assetDailyCorrelation: window.assetDailyCorrelation,
      drawdownComparison: window.drawdownComparison
    }))),
    aggregateDiagnostics: Object.freeze({
      monthlyTailRisk: tailRisk,
      assetCorrelationRange: Object.freeze({ min: Math.min(...correlations), max: Math.max(...correlations), mean: correlations.reduce((sum, value) => sum + value, 0) / correlations.length }),
      adverseDrawdownWindows: Object.freeze(adverseWindows),
      adverseDrawdownWindowCount: adverseWindows.length,
      windowCount: windows.length
    }),
    interpretation: Object.freeze({
      verdict: null,
      statement: 'Le diagnostic recherche des mécanismes plausibles de sous-estimation du drawdown sans modifier le moteur après observation des résultats.'
    }),
    limitations: Object.freeze([
      'La source Yahoo reste une source publique de validation empirique par proxy, pas une série MSCI licenciée.',
      'Cinq fenêtres annuelles restent un petit échantillon et ne permettent pas de qualifier une fréquence calibrée.',
      'La corrélation IWDA/PAEJ est mesurée à titre diagnostique ; le pilote beginner actuel utilise une hypothèse agrégée, donc cette corrélation ne constitue pas à elle seule une explication causale.',
      'Les diagnostics de queues et de volatilité décrivent les observations préenregistrées ; ils ne justifient pas automatiquement une nouvelle paramétrisation.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runBeginnerRiskDiagnosticsV1();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-drawdown-risk-diagnostics-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
