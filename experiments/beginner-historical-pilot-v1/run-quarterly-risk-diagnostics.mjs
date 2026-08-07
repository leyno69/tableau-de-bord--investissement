import { mkdir, writeFile } from 'node:fs/promises';
import { classifyDrawdownAgainstSimulation, maxDrawdownFromValues } from '../../validation/historicalRiskDiagnostics.js';
import comparison from './quarterly-comparison-results-dev.json' with { type: 'json' };

const QUARTERS = Object.freeze([
  ['2024-Q2', '2024-04-01', '2024-06-30'],
  ['2024-Q3', '2024-07-01', '2024-09-30'],
  ['2024-Q4', '2024-10-01', '2024-12-31'],
  ['2025-Q1', '2025-01-01', '2025-03-31'],
  ['2025-Q2', '2025-04-01', '2025-06-30'],
  ['2025-Q3', '2025-07-01', '2025-09-30'],
  ['2025-Q4', '2025-10-01', '2025-12-31'],
  ['2026-Q1', '2026-01-01', '2026-03-31']
].map(([id, start, end]) => Object.freeze({ id, start, end })));

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }
async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end) + 86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-quarterly-risk-diagnostics/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}

function commonRows(world, asia) {
  const asiaMap = new Map(asia.map(point => [point.date, point.price]));
  return world.filter(point => asiaMap.has(point.date)).map(point => ({ date: point.date, worldPrice: point.price, asiaPrice: asiaMap.get(point.date) })).sort((a, b) => a.date.localeCompare(b.date));
}

function portfolioPath(rows) {
  const first = rows[0];
  const worldShares = 0.50 / first.worldPrice;
  const asiaShares = 0.15 / first.asiaPrice;
  return rows.map(row => ({ date: row.date, value: worldShares * row.worldPrice + asiaShares * row.asiaPrice + 0.35 }));
}

function monthEnds(path) {
  const byMonth = new Map();
  for (const point of path) byMonth.set(point.date.slice(0, 7), point);
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function analyzeQuarter(quarter) {
  const [wpea, paej] = await Promise.all([
    fetchAdjustedDaily('WPEA.PA', quarter.start, quarter.end),
    fetchAdjustedDaily('PAEJ.PA', quarter.start, quarter.end)
  ]);
  const rows = commonRows(wpea, paej);
  if (rows.length < 20) throw new Error(`${quarter.id}: couverture insuffisante`);
  const path = portfolioPath(rows);
  const daily = maxDrawdownFromValues(path.map(point => point.value));
  const monthly = maxDrawdownFromValues(monthEnds(path).map(point => point.value));
  return Object.freeze({
    id: quarter.id,
    observationCount: rows.length,
    dailyDrawdown: daily,
    monthlySampledDrawdown: monthly,
    intramonthDrawdownGap: daily - monthly,
    dailyComparison: classifyDrawdownAgainstSimulation(daily, comparison.simulation.drawdown),
    monthlyMatchedComparison: classifyDrawdownAgainstSimulation(monthly, comparison.simulation.drawdown)
  });
}

export async function runQuarterlyRiskDiagnostics() {
  const windows = [];
  for (const quarter of QUARTERS) windows.push(await analyzeQuarter(quarter));
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-quarterly-drawdown-frequency-diagnostics-v1',
    status: 'descriptive-diagnostics',
    simulationHorizonMonths: comparison.horizonMonths,
    simulationDrawdown: comparison.simulation.drawdown,
    windows: Object.freeze(windows),
    summary: Object.freeze({
      dailyAdverseWindows: Object.freeze(windows.filter(item => item.dailyComparison.adverseEvidence).map(item => item.id)),
      monthlyMatchedAdverseWindows: Object.freeze(windows.filter(item => item.monthlyMatchedComparison.adverseEvidence).map(item => item.id)),
      maxIntramonthDrawdownGap: Math.max(...windows.map(item => item.intramonthDrawdownGap))
    }),
    interpretation: Object.freeze({
      verdict: null,
      statement: 'Une preuve adverse de drawdown n’est conservée comme appariée que si elle subsiste avec la fréquence mensuelle utilisée par la simulation.'
    })
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runQuarterlyRiskDiagnostics();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-quarterly-drawdown-frequency-diagnostics-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
