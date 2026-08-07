import { mkdir, writeFile } from 'node:fs/promises';
import { runDailyGaussianDrawdownExperiment } from '../../validation/dailyGaussianDrawdownExperiment.js';
import { classifyDrawdownAgainstSimulation } from '../../validation/historicalRiskDiagnostics.js';
import annualHistory from './results.json' with { type: 'json' };
import quarterlyHistory from '../beginner-historical-pilot-v1/exact-quarterly-results-dev.json' with { type: 'json' };

const annualSimulation = runDailyGaussianDrawdownExperiment({ pathCount: 10000, tradingDays: 252, annualReturn: 0.045, annualVolatility: 0.10, seed: 20260807 });
const quarterlySimulation = runDailyGaussianDrawdownExperiment({ pathCount: 10000, tradingDays: 63, annualReturn: 0.045, annualVolatility: 0.10, seed: 20260807 });

function compareWindows(windows, simulation) {
  return windows.map(window => {
    const observed = Math.abs(window.metrics?.maxDrawdown ?? window.maxDrawdown);
    return Object.freeze({ id: window.id, observedDailyDrawdown: observed, comparison: classifyDrawdownAgainstSimulation(observed, simulation.drawdown) });
  });
}

export function runDailyDrawdownComparison() {
  const annualWindows = compareWindows(annualHistory.windows, annualSimulation);
  const quarterlyWindows = compareWindows(quarterlyHistory.windows, quarterlySimulation);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-daily-gaussian-drawdown-comparison-v1',
    status: 'experimental-comparator-only',
    preregisteredModel: Object.freeze({ distribution: 'gaussian-daily', annualReturn: 0.045, annualVolatility: 0.10, seed: 20260807, annualTradingDays: 252, quarterlyTradingDays: 63, pathCount: 10000 }),
    annual: Object.freeze({ simulation: annualSimulation.drawdown, windows: Object.freeze(annualWindows), adverseWindows: Object.freeze(annualWindows.filter(item => item.comparison.adverseEvidence).map(item => item.id)) }),
    quarterly: Object.freeze({ simulation: quarterlySimulation.drawdown, windows: Object.freeze(quarterlyWindows), adverseWindows: Object.freeze(quarterlyWindows.filter(item => item.comparison.adverseEvidence).map(item => item.id)) }),
    interpretation: Object.freeze({
      verdict: null,
      statement: 'Cette expérience teste uniquement si une simulation gaussienne à fréquence quotidienne couvre mieux les drawdowns quotidiens historiques. Elle ne remplace pas le moteur mensuel et ne valide pas la loi gaussienne.'
    }),
    limitations: Object.freeze([
      'Les hypothèses de rendement et volatilité restent celles du pilote beginner.',
      'La loi quotidienne reste gaussienne et sans volatilité conditionnelle.',
      'Les données historiques annuelles utilisent un proxy ETF pour WPEA avant 2024.',
      'Les données trimestrielles Yahoo restent development-only.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runDailyDrawdownComparison();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/beginner-daily-gaussian-drawdown-comparison-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
