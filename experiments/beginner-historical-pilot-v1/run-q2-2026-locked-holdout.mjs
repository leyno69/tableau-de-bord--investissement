import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from '../../validation/portfolioHistoricalMetrics.js';
import { diagnoseHistoricalCoverage } from '../../validation/historicalCoverageDiagnostics.js';
import { runBeginnerQuarterlySimulationPilot } from './run-quarterly-simulation.mjs';

const WINDOW = Object.freeze({ requestedStart: '2026-04-01', requestedEnd: '2026-06-30' });
const SYMBOLS = Object.freeze({ WPEA: 'WPEA.PA', PAEJ: 'PAEJ.PA' });

function unixSeconds(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
}

async function fetchAdjustedDaily(symbol) {
  const period1 = unixSeconds(WINDOW.requestedStart);
  const period2 = unixSeconds(WINDOW.requestedEnd) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-locked-holdout/1.0' } });
  if (!response.ok) throw new Error(`source historique indisponible pour ${symbol}: HTTP ${response.status}`);
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

export async function runQ22026LockedHoldout() {
  const [wpea, paej] = await Promise.all([fetchAdjustedDaily(SYMBOLS.WPEA), fetchAdjustedDaily(SYMBOLS.PAEJ)]);
  const dates = commonDates(wpea, paej);
  if (dates.length < 2) throw new Error('holdout 2026-Q2: moins de deux dates communes');
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: 'beginner-q2-2026-locked-holdout-v1',
    initialCash: 10000,
    allocation: [
      { ticker: 'WPEA', weight: 0.50 },
      { ticker: 'PAEJ', weight: 0.15 },
      { ticker: 'CASH', weight: 0.35 }
    ],
    costPolicy: { transactionCostBps: 0 },
    seriesByTicker: { WPEA: wpea, PAEJ: paej, CASH: cash },
    startDate: dates[0],
    endDate: dates.at(-1),
    contributions: [],
    rebalanceDates: []
  });
  const metrics = calculateReplayHistoricalMetrics(replay);
  const simulation = runBeginnerQuarterlySimulationPilot();
  const coverage = diagnoseHistoricalCoverage({
    simulation: simulation.summary,
    historical: { finalValue: replay.finalValue, maxDrawdown: metrics.maxDrawdown }
  });
  const adverseEvidence = [];
  if (coverage.finalValue.band === 'below-p05' || coverage.finalValue.band === 'above-p95') {
    adverseEvidence.push({ metric: 'finalValue', band: coverage.finalValue.band, observed: coverage.finalValue.observed });
  }
  if (coverage.drawdown.band === 'p95-maximum' || coverage.drawdown.band === 'above-maximum') {
    adverseEvidence.push({ metric: 'drawdown', band: coverage.drawdown.band, observed: coverage.drawdown.observedMagnitude });
  }
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-q2-2026-locked-holdout-v1',
    preregistrationCommit: '95334ae0fb0de10e53d22b94b67e1dc2cc1197c2',
    status: 'locked-holdout-development-source',
    source: { providerId: 'yahoo-finance-chart-dev', usage: 'development', validationEligibleSource: false },
    requestedWindow: WINDOW,
    effectiveWindow: { startDate: dates[0], endDate: dates.at(-1), commonObservationCount: dates.length },
    historical: {
      finalValue: replay.finalValue,
      cumulativeReturn: metrics.cumulativeReturn,
      annualizedReturn: metrics.annualizedReturn,
      annualizedVolatility: metrics.annualizedVolatility,
      maxDrawdown: metrics.maxDrawdown,
      recovery: metrics.recovery,
      durationDays: metrics.durationDays
    },
    lockedSimulation: {
      portfolioCount: simulation.summary.portfolioCount,
      seed: simulation.definition.seed,
      nominal: simulation.summary.nominal,
      drawdown: simulation.summary.drawdown
    },
    coverage,
    adverseEvidence: Object.freeze(adverseEvidence),
    interpretation: {
      verdict: null,
      statement: 'Le résultat est un holdout préenregistré à source development-only. Les bandes restent descriptives et ne constituent pas un verdict scientifique.'
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runQ22026LockedHoldout();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-q2-2026-locked-holdout.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
