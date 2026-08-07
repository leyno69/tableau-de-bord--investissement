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
  const period1 = unix(start);
  const period2 = unix(end) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
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

function commonSeries(a, b) {
  const mapB = new Map(b.map(point => [point.date, point.price]));
  return a.filter(point => mapB.has(point.date)).map(point => ({ date: point.date, a: point.price, b: mapB.get(point.date) }));
}

function returns(points, key) {
  const out = [];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1][key];
    const current = points[i][key];
    if (previous > 0 && current > 0) out.push(current / previous - 1);
  }
  return out;
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}
function std(values) { return Math.sqrt(variance(values)); }

function skewness(values) {
  const n = values.length;
  if (n < 3) return null;
  const m = mean(values);
  const s = std(values);
  if (s === 0) return 0;
  return (n / ((n - 1) * (n - 2))) * values.reduce((sum, value) => sum + ((value - m) / s) ** 3, 0);
}

function excessKurtosis(values) {
  const n = values.length;
  if (n < 4) return null;
  const m = mean(values);
  const s = std(values);
  if (s === 0) return 0;
  const z4 = values.reduce((sum, value) => sum + ((value - m) / s) ** 4, 0);
  return (n * (n + 1) * z4) / ((n - 1) * (n - 2) * (n - 3)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const aa = a.slice(0, n); const bb = b.slice(0, n);
  const ma = mean(aa); const mb = mean(bb);
  const numerator = aa.reduce((sum, value, i) => sum + (value - ma) * (bb[i] - mb), 0);
  const denominator = Math.sqrt(aa.reduce((sum, value) => sum + (value - ma) ** 2, 0) * bb.reduce((sum, value) => sum + (value - mb) ** 2, 0));
  return denominator === 0 ? null : numerator / denominator;
}

function lag1SquaredReturnCorrelation(values) {
  if (values.length < 3) return null;
  const squared = values.map(value => value ** 2);
  return correlation(squared.slice(1), squared.slice(0, -1));
}

function tailFrequency(values, sigmaMultiple = 2) {
  const m = mean(values); const s = std(values);
  if (s === 0) return 0;
  return values.filter(value => Math.abs(value - m) >= sigmaMultiple * s).length / values.length;
}

async function runWindow(window) {
  const [world, asia] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.world, window.start, window.end),
    fetchAdjustedDaily(SYMBOLS.asia, window.start, window.end)
  ]);
  const common = commonSeries(world, asia);
  if (common.length < 200) throw new Error(`${window.id}: couverture insuffisante (${common.length})`);
  const rw = returns(common, 'a');
  const ra = returns(common, 'b');
  return Object.freeze({
    id: window.id,
    observationCount: common.length,
    world: Object.freeze({ skewness: skewness(rw), excessKurtosis: excessKurtosis(rw), tailFrequency2Sigma: tailFrequency(rw), squaredReturnLag1: lag1SquaredReturnCorrelation(rw) }),
    asia: Object.freeze({ skewness: skewness(ra), excessKurtosis: excessKurtosis(ra), tailFrequency2Sigma: tailFrequency(ra), squaredReturnLag1: lag1SquaredReturnCorrelation(ra) }),
    crossAssetCorrelation: correlation(rw, ra)
  });
}

export async function runBeginnerRiskDiagnosticsV1() {
  const windows = [];
  for (const window of WINDOWS) windows.push(await runWindow(window));
  const flags = [];
  for (const window of windows) {
    if ((window.world.excessKurtosis ?? 0) > 1 || (window.asia.excessKurtosis ?? 0) > 1) flags.push({ windowId: window.id, hypothesis: 'fat-tails' });
    if ((window.world.skewness ?? 0) < -0.5 || (window.asia.skewness ?? 0) < -0.5) flags.push({ windowId: window.id, hypothesis: 'negative-skew' });
    if ((window.world.squaredReturnLag1 ?? 0) > 0.1 || (window.asia.squaredReturnLag1 ?? 0) > 0.1) flags.push({ windowId: window.id, hypothesis: 'volatility-clustering' });
    if ((window.crossAssetCorrelation ?? 0) > 0.7) flags.push({ windowId: window.id, hypothesis: 'high-cross-asset-correlation' });
  }
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-risk-diagnostics-v1',
    status: 'diagnostic-only',
    windows: Object.freeze(windows),
    flags: Object.freeze(flags),
    interpretation: Object.freeze({
      statement: 'Ces diagnostics testent des violations observables des hypothèses gaussiennes/indépendantes avant toute modification du moteur.',
      engineChangeAuthorized: false
    }),
    limitations: Object.freeze([
      'Les prix proviennent d’une source publique et cette expérience reste un diagnostic empirique, pas une estimation structurelle définitive.',
      'Cinq fenêtres ne suffisent pas à calibrer un nouveau modèle de risque.',
      'Les seuils de signalement servent à prioriser l’investigation et ne constituent pas des seuils de validation.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runBeginnerRiskDiagnosticsV1();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-risk-diagnostics-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
