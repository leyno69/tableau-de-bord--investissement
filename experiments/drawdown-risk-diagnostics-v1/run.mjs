import { mkdir, writeFile } from 'node:fs/promises';

const WINDOWS = Object.freeze([
  Object.freeze({ id: '2015', start: '2015-01-02', end: '2015-12-31' }),
  Object.freeze({ id: '2018', start: '2018-01-02', end: '2018-12-31' }),
  Object.freeze({ id: '2020', start: '2020-01-02', end: '2020-12-31' }),
  Object.freeze({ id: '2022', start: '2022-01-03', end: '2022-12-30' }),
  Object.freeze({ id: '2023', start: '2023-01-02', end: '2023-12-29' })
]);

const SYMBOLS = Object.freeze({ world: 'IWDA.AS', asia: 'PAEJ.PA' });

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end)+86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-risk-diagnostics/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    price: adjusted[index]
  })).filter(point => Number.isFinite(point.price));
}

function monthlyReturns(series) {
  const lastByMonth = new Map();
  for (const point of series) lastByMonth.set(point.date.slice(0, 7), point);
  const points = [...lastByMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
  const out = [];
  for (let i = 1; i < points.length; i += 1) out.push({
    month: points[i].date.slice(0, 7),
    value: points[i].price / points[i - 1].price - 1
  });
  return out;
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}
function stdev(values) { return Math.sqrt(variance(values)); }
function skewness(values) {
  if (values.length < 3) return 0;
  const m = mean(values); const s = stdev(values);
  if (s === 0) return 0;
  return values.reduce((sum, value) => sum + ((value - m) / s) ** 3, 0) / values.length;
}
function excessKurtosis(values) {
  if (values.length < 4) return 0;
  const m = mean(values); const s = stdev(values);
  if (s === 0) return 0;
  return values.reduce((sum, value) => sum + ((value - m) / s) ** 4, 0) / values.length - 3;
}
function correlation(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = mean(a); const mb = mean(b);
  let covariance = 0; let va = 0; let vb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - ma; const db = b[i] - mb;
    covariance += da * db; va += da * da; vb += db * db;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? null : covariance / denom;
}
function lag1AbsoluteReturnCorrelation(values) {
  if (values.length < 3) return null;
  const abs = values.map(Math.abs);
  return correlation(abs.slice(0, -1), abs.slice(1));
}
function maxAbsZ(values) {
  const m = mean(values); const s = stdev(values);
  if (s === 0) return 0;
  return Math.max(...values.map(value => Math.abs((value - m) / s)));
}
function summarize(values) {
  return Object.freeze({
    observations: values.length,
    mean: mean(values),
    volatility: stdev(values),
    skewness: skewness(values),
    excessKurtosis: excessKurtosis(values),
    maxAbsoluteZ: maxAbsZ(values),
    absoluteReturnLag1Correlation: lag1AbsoluteReturnCorrelation(values)
  });
}

async function runWindow(window) {
  const [worldSeries, asiaSeries] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.world, window.start, window.end),
    fetchAdjustedDaily(SYMBOLS.asia, window.start, window.end)
  ]);
  const world = monthlyReturns(worldSeries);
  const asia = monthlyReturns(asiaSeries);
  const asiaMap = new Map(asia.map(item => [item.month, item.value]));
  const common = world.filter(item => asiaMap.has(item.month));
  const worldValues = common.map(item => item.value);
  const asiaValues = common.map(item => asiaMap.get(item.month));
  return Object.freeze({
    id: window.id,
    world: summarize(worldValues),
    asia: summarize(asiaValues),
    crossAssetMonthlyCorrelation: correlation(worldValues, asiaValues)
  });
}

export async function runDrawdownRiskDiagnosticsV1() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await runWindow(window));
  const flags = [];
  for (const window of windows) {
    for (const [asset, stats] of [['world', window.world], ['asia', window.asia]]) {
      if (stats.excessKurtosis > 1) flags.push({ windowId: window.id, asset, signal: 'fat-tails', value: stats.excessKurtosis });
      if (Math.abs(stats.skewness) > 0.75) flags.push({ windowId: window.id, asset, signal: 'asymmetry', value: stats.skewness });
      if (stats.maxAbsoluteZ > 2.5) flags.push({ windowId: window.id, asset, signal: 'extreme-month', value: stats.maxAbsoluteZ });
      if ((stats.absoluteReturnLag1Correlation ?? 0) > 0.25) flags.push({ windowId: window.id, asset, signal: 'volatility-clustering', value: stats.absoluteReturnLag1Correlation });
    }
    if ((window.crossAssetMonthlyCorrelation ?? 0) > 0.65) flags.push({ windowId: window.id, asset: 'pair', signal: 'high-cross-asset-correlation', value: window.crossAssetMonthlyCorrelation });
  }
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'drawdown-risk-diagnostics-v1',
    source: { provider: 'Yahoo Finance chart API', usage: 'empirical-supporting-evidence', validationEligibleBenchmarkSource: false },
    windows: Object.freeze(windows),
    flags: Object.freeze(flags),
    interpretation: Object.freeze({
      verdict: null,
      rule: 'Aucune modification du moteur ne doit être décidée à partir d’un seul signal ou d’une seule fenêtre.',
      candidateMechanisms: Object.freeze(['fat-tails', 'asymmetry', 'volatility-clustering', 'cross-asset-correlation'])
    }),
    limitations: Object.freeze([
      'Les statistiques mensuelles par fenêtre annuelle ont un faible effectif.',
      'Les données sont issues de prix publics ajustés et non de séries benchmark licenciées.',
      'Ces diagnostics recherchent des mécanismes plausibles ; ils ne démontrent pas une causalité.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runDrawdownRiskDiagnosticsV1();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/drawdown-risk-diagnostics-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
