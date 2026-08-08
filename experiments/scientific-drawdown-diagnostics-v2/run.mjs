import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { analyzeDependence, analyzeDrawdownEpisodes, analyzeVolatilityPersistence, describeDistribution } from '../../validation/scientificDrawdownDiagnostics.js';
import { runDailyGaussianDrawdownExperiment } from '../../validation/dailyGaussianDrawdownExperiment.js';

const PERIOD = Object.freeze({ start: '2014-06-02', end: '2023-12-31' });
const SYMBOLS = Object.freeze({ world: 'IWDA.AS', asia: 'PAEJ.PA' });
const WEIGHTS = Object.freeze({ world: 0.50, asia: 0.15, cash: 0.35 });

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }
async function fetchAdjustedDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(PERIOD.start)}&period2=${unix(PERIOD.end) + 86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-scientific-drawdown-diagnostics-v2/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json(); const result = payload?.chart?.result?.[0]; const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}
function aligned(left, right) { const map = new Map(right.map(point => [point.date, point.price])); return left.filter(point => map.has(point.date)).map(point => ({ date: point.date, world: point.price, asia: map.get(point.date) })); }
function returns(values) { return values.slice(1).map((value, index) => value / values[index] - 1); }
function portfolioPath(rows) { const first = rows[0]; const ws = WEIGHTS.world / first.world; const as = WEIGHTS.asia / first.asia; return rows.map(row => ({ date: row.date, value: ws * row.world + as * row.asia + WEIGHTS.cash })); }
function monthEnds(path) { const map = new Map(); path.forEach(point => map.set(point.date.slice(0, 7), point)); return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)); }
function enrichEpisodes(analysis, path) { return analysis.episodes.map(episode => Object.freeze({ ...episode, peakDate: path[episode.peakIndex].date, troughDate: path[episode.troughIndex].date, recoveryDate: episode.recoveryIndex == null ? null : path[episode.recoveryIndex].date })); }
function inputFingerprint(rows) { return createHash('sha256').update(JSON.stringify(rows)).digest('hex'); }

export async function runScientificDrawdownDiagnosticsV2() {
  const [worldRaw, asiaRaw] = await Promise.all([fetchAdjustedDaily(SYMBOLS.world), fetchAdjustedDaily(SYMBOLS.asia)]); const rows = aligned(worldRaw, asiaRaw);
  const worldReturns = returns(rows.map(row => row.world)); const asiaReturns = returns(rows.map(row => row.asia)); const path = portfolioPath(rows); const dailyReturns = returns(path.map(point => point.value));
  const monthlyPath = monthEnds(path); const monthlyReturns = returns(monthlyPath.map(point => point.value));
  const dailyDrawdowns = analyzeDrawdownEpisodes(path.map(point => point.value)); const monthlyDrawdowns = analyzeDrawdownEpisodes(monthlyPath.map(point => point.value));
  const gaussianComparator = runDailyGaussianDrawdownExperiment({ pathCount: 10000, tradingDays: dailyReturns.length, annualReturn: 0.045, annualVolatility: 0.10, seed: 20260807 });
  const normalTailExpectation = Object.freeze({ beyond2SigmaExpected: dailyReturns.length * 0.04550026389635842, beyond3SigmaExpected: dailyReturns.length * 0.002699796063260207 });
  return Object.freeze({
    schemaVersion: 2, experimentId: 'scientific-drawdown-diagnostics-v2', status: 'descriptive-no-engine-change-authority', source: Object.freeze({ provider: 'Yahoo Finance chart API', symbols: SYMBOLS, adjustedClose: true, licensedBenchmark: false, alignedInputSha256: inputFingerprint(rows) }), period: Object.freeze({ requested: PERIOD, effectiveStart: rows[0].date, effectiveEnd: rows.at(-1).date, dailyObservationCount: rows.length }),
    historical: Object.freeze({ dailyReturns: describeDistribution(dailyReturns), monthlyReturns: describeDistribution(monthlyReturns), dailyDrawdowns: Object.freeze({ ...dailyDrawdowns, episodes: Object.freeze(enrichEpisodes(dailyDrawdowns, path)) }), monthlyDrawdowns: Object.freeze({ ...monthlyDrawdowns, episodes: Object.freeze(enrichEpisodes(monthlyDrawdowns, monthlyPath)) }), dependence: analyzeDependence(worldReturns, asiaReturns, dailyReturns, 63), volatilityPersistence: analyzeVolatilityPersistence(dailyReturns, 21) }),
    comparators: Object.freeze({ gaussianDailyMaximumDrawdown: gaussianComparator.drawdown, normalTailExpectation, heavyTailCrossValidationId: 'heavy-tail-cross-validation-v1', conditionalVolatilityCrossValidationId: 'conditional-volatility-cross-validation-v1' }),
    governance: Object.freeze({ engineModified: false, calibrationModified: false, decision: 'diagnostic-only', rule: 'Aucun résultat de ce diagnostic descriptif ne peut modifier le moteur sans validation confirmatoire indépendante préenregistrée.' }),
    limitations: Object.freeze(['IWDA.AS et PAEJ.PA sont des proxies ETF publics, pas une série officielle MSCI licenciée.', 'Les cours Yahoo sont interrogés en direct et peuvent être révisés ; leur empreinte détecte une dérive mais ne permet pas de reconstruire une version historique non archivée.', 'Une trajectoire historique unique ne fournit pas une fréquence populationnelle des drawdowns.', 'Les corrélations conditionnelles sont descriptives et les sous-échantillons baissiers ne sont pas iid.', 'Le comparateur gaussien quotidien est expérimental et ne remplace pas le moteur mensuel de production.'])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) { const result = await runScientificDrawdownDiagnosticsV2(); await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/scientific-drawdown-diagnostics-v2.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8'); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); }
