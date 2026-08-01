import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createPortfolioCohort } from '../lab/portfolio-cohort.js';

const endpoint = process.env.LEYNOR_LAB_SNAPSHOT_URL || 'https://tableau-de-bord-investissement.vercel.app/api/lab-snapshot';
const statePath = 'data/investor-lab/state.json';
const historyPath = 'data/investor-lab/history.jsonl';
const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
if (!response.ok) throw new Error(`Snapshot indisponible (${response.status}).`);
const market = await response.json();
const prices = Object.fromEntries((market.snapshots || []).filter(item => item.status === 'ok').map(item => [item.symbol, Number(item.price)]));
if (Object.keys(prices).length < 5) throw new Error('Trop peu de cotations exploitables pour la simulation quotidienne.');

await mkdir('data/investor-lab', { recursive: true });
let state = null;
try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch {}
const cohort = createPortfolioCohort({ variantsPerCell: 5 });

if (!state) {
  state = {
    startedAt: market.generatedAt,
    portfolios: cohort.map(portfolio => ({
      ...portfolio,
      units: Object.fromEntries(Object.entries(portfolio.weights).filter(([symbol]) => symbol !== 'CASH' && prices[symbol]).map(([symbol, weight]) => [symbol, portfolio.initialCapital * weight / prices[symbol]])),
      cash: portfolio.initialCapital * (portfolio.weights.CASH || 0)
    }))
  };
}

const evaluated = state.portfolios.map(portfolio => {
  const investedValue = Object.entries(portfolio.units).reduce((sum, [symbol, units]) => sum + units * (prices[symbol] || 0), 0);
  const value = investedValue + portfolio.cash;
  return {
    id: portfolio.id,
    profile: portfolio.profile,
    initialCapital: portfolio.initialCapital,
    value: round(value),
    returnPct: round(((value / portfolio.initialCapital) - 1) * 100),
    observedAt: market.generatedAt
  };
});

const byProfile = Object.fromEntries(['prudent','modere','agressif'].map(profile => {
  const rows = evaluated.filter(item => item.profile === profile);
  return [profile, {
    count: rows.length,
    averageReturnPct: round(rows.reduce((sum, item) => sum + item.returnPct, 0) / rows.length),
    bestReturnPct: Math.max(...rows.map(item => item.returnPct)),
    worstReturnPct: Math.min(...rows.map(item => item.returnPct))
  }];
}));

const record = { observedAt: market.generatedAt, source: 'FINNHUB', portfolioCount: evaluated.length, prices, byProfile, portfolios: evaluated };
await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
await writeFile(historyPath, JSON.stringify(record) + '\n', { flag: 'a' });
await writeFile('data/investor-lab/latest.json', JSON.stringify(record, null, 2) + '\n');
console.log(`Cohorte évaluée : ${evaluated.length} portefeuilles.`);

function round(value) { return Math.round(value * 10000) / 10000; }
