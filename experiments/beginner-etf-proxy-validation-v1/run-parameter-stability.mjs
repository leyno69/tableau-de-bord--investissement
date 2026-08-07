import { mkdir, writeFile } from 'node:fs/promises';
import { bootstrapMonthlyParameterStability } from '../../validation/parameterStabilityBootstrap.js';

const PERIODS = Object.freeze([
  Object.freeze({ id: 'calibration-2014-2023', start: '2014-06-01', end: '2023-12-31' }),
  Object.freeze({ id: 'holdout-2024-2026', start: '2024-01-01', end: '2026-07-31' })
]);
function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end) + 86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-parameter-stability/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}

function commonRows(world, asia) {
  const asiaMap = new Map(asia.map(point => [point.date, point.price]));
  return world.filter(point => asiaMap.has(point.date)).map(point => ({ date: point.date, world: point.price, asia: asiaMap.get(point.date) })).sort((a, b) => a.date.localeCompare(b.date));
}
function monthEnds(path) {
  const byMonth = new Map();
  for (const point of path) byMonth.set(point.date.slice(0, 7), point);
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}
function returns(values) { return values.slice(1).map((value, index) => value / values[index] - 1); }

async function analyzePeriod(period, seed) {
  const [world, asia] = await Promise.all([fetchAdjustedDaily('IWDA.AS', period.start, period.end), fetchAdjustedDaily('PAEJ.PA', period.start, period.end)]);
  const rows = commonRows(world, asia);
  if (rows.length < 250) throw new Error(`${period.id}: couverture insuffisante (${rows.length})`);
  const first = rows[0];
  const worldShares = 0.50 / first.world;
  const asiaShares = 0.15 / first.asia;
  const path = rows.map(row => ({ date: row.date, value: worldShares * row.world + asiaShares * row.asia + 0.35 }));
  const monthlyReturns = returns(monthEnds(path).map(point => point.value));
  return Object.freeze({
    id: period.id,
    effectivePeriod: Object.freeze({ start: rows[0].date, end: rows.at(-1).date, monthlyObservationCount: monthlyReturns.length }),
    bootstrap: bootstrapMonthlyParameterStability({ returns: monthlyReturns, targetAnnualReturn: 0.045, targetAnnualVolatility: 0.10, replicates: 10000, seed, alpha: 0.05 })
  });
}

export async function runBeginnerParameterStability() {
  const calibration = await analyzePeriod(PERIODS[0], 20260807);
  const holdout = await analyzePeriod(PERIODS[1], 20260808);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-parameter-stability-v1',
    status: 'descriptive-bootstrap-validation',
    target: Object.freeze({ annualReturn: 0.045, annualVolatility: 0.10 }),
    calibration,
    holdout,
    replicatedCompatibility: Object.freeze({
      returnTargetCompatibleBoth: calibration.bootstrap.compatibility.returnTargetInsideInterval && holdout.bootstrap.compatibility.returnTargetInsideInterval,
      volatilityTargetCompatibleBoth: calibration.bootstrap.compatibility.volatilityTargetInsideInterval && holdout.bootstrap.compatibility.volatilityTargetInsideInterval
    }),
    interpretation: Object.freeze({
      verdict: null,
      statement: 'Les paramètres ne doivent être modifiés que si une incompatibilité robuste apparaît dans plusieurs échantillons. Une compatibilité bootstrap ne prouve pas qu’ils sont optimaux.'
    }),
    limitations: Object.freeze([
      'IWDA reste un proxy ETF de WPEA avant 2024.',
      'Les intervalles bootstrap rééchantillonnent les mois comme observations échangeables et n’intègrent pas explicitement une dépendance temporelle.',
      'Le holdout est court.',
      'La source Yahoo reste une source publique de validation empirique par proxy.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runBeginnerParameterStability();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-parameter-stability-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
