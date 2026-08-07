import { mkdir, writeFile } from 'node:fs/promises';
import { describeReturnTailRisk } from '../../validation/historicalRiskDiagnostics.js';
import pilot from '../beginner-historical-pilot-v1/results.json' with { type: 'json' };

const START = '2014-06-01';
const END = '2023-12-31';
function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(START)}&period2=${unix(END) + 86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-monthly-distribution-adequacy/1.0' } });
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

function jarqueBera({ observationCount, skewness, excessKurtosis }) {
  const statistic = observationCount / 6 * (skewness ** 2 + (excessKurtosis ** 2) / 4);
  const approximatePValueDf2 = Math.exp(-statistic / 2);
  return Object.freeze({ statistic, approximatePValueDf2 });
}

export async function runMonthlyDistributionAdequacy() {
  const [world, asia] = await Promise.all([fetchAdjustedDaily('IWDA.AS'), fetchAdjustedDaily('PAEJ.PA')]);
  const rows = commonRows(world, asia);
  if (rows.length < 1000) throw new Error(`couverture insuffisante: ${rows.length}`);
  const first = rows[0];
  const worldShares = 0.50 / first.world;
  const asiaShares = 0.15 / first.asia;
  const path = rows.map(row => ({ date: row.date, value: worldShares * row.world + asiaShares * row.asia + 0.35 }));
  const monthlyPath = monthEnds(path);
  const monthlyReturns = returns(monthlyPath.map(point => point.value));
  const referenceMonthlyMean = Math.pow(1 + pilot.definition.annualReturn, 1 / 12) - 1;
  const referenceMonthlyVolatility = pilot.definition.annualVolatility / Math.sqrt(12);
  const tailRisk = describeReturnTailRisk(monthlyReturns, { referenceMonthlyMean, referenceMonthlyVolatility });
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-monthly-distribution-adequacy-v1',
    status: 'diagnostic-only',
    period: Object.freeze({ start: rows[0].date, end: rows.at(-1).date, monthlyObservationCount: monthlyReturns.length }),
    modelReference: Object.freeze({ annualReturn: pilot.definition.annualReturn, annualVolatility: pilot.definition.annualVolatility, distribution: 'gaussian-monthly' }),
    empirical: tailRisk,
    normalityDiagnostic: jarqueBera(tailRisk),
    interpretationPolicy: Object.freeze({
      rejectThreshold: 0.05,
      noAutomaticRecalibration: true,
      statement: 'Le test est diagnostique. Un rejet statistique ou des queues plus lourdes doivent être reproduits hors échantillon avant toute modification du moteur.'
    }),
    limitations: Object.freeze([
      'IWDA est un proxy ETF explicite de WPEA avant 2024.',
      'PAEJ limite la profondeur historique commune à son existence.',
      'Le test de Jarque-Bera suppose une interprétation asymptotique et son p-value est approximative.',
      'Une absence de rejet ne prouve pas que la loi gaussienne est vraie.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runMonthlyDistributionAdequacy();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-monthly-distribution-adequacy-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
