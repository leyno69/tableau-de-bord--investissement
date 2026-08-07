import { readFile } from 'node:fs/promises';
import { diagnoseHistoricalCoverage } from '../../validation/historicalCoverageDiagnostics.js';
import { runBeginnerQuarterlySimulationPilot } from './run-quarterly-simulation.mjs';

const HISTORICAL_RESULTS_URL = new URL('./exact-quarterly-results-dev.json', import.meta.url);

export async function runBeginnerQuarterlyComparison() {
  const historicalPayload = JSON.parse(await readFile(HISTORICAL_RESULTS_URL, 'utf8'));
  const simulation = runBeginnerQuarterlySimulationPilot();
  const windows = historicalPayload.windows.map(window => Object.freeze({
    id: window.id,
    cumulativeReturn: window.cumulativeReturn,
    annualizedVolatility: window.annualizedVolatility,
    recovered: window.recovered,
    coverage: diagnoseHistoricalCoverage({ simulation: simulation.summary, historical: window })
  }));

  const adverseEvidence = windows.flatMap(window => {
    const evidence = [];
    if (window.coverage.finalValue.band === 'below-p05' || window.coverage.finalValue.band === 'above-p95') {
      evidence.push(Object.freeze({ windowId: window.id, metric: 'finalValue', band: window.coverage.finalValue.band, observed: window.coverage.finalValue.observed }));
    }
    if (window.coverage.drawdown.band === 'p95-maximum' || window.coverage.drawdown.band === 'above-maximum') {
      evidence.push(Object.freeze({ windowId: window.id, metric: 'drawdown', band: window.coverage.drawdown.band, observed: window.coverage.drawdown.observedMagnitude }));
    }
    return evidence;
  });

  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'beginner-quarterly-simulation-vs-exact-history-dev-v1',
    status: 'descriptive-development-comparison',
    horizonMonths: 3,
    simulation: Object.freeze({
      portfolioCount: simulation.summary.portfolioCount,
      seed: simulation.definition.seed,
      nominal: simulation.summary.nominal,
      drawdown: simulation.summary.drawdown
    }),
    historicalTrack: 'exact',
    windows: Object.freeze(windows),
    adverseEvidence: Object.freeze(adverseEvidence),
    interpretation: Object.freeze({
      verdict: null,
      statement: 'Les observations sont positionnées dans les bandes de la simulation trimestrielle de même horizon. Aucun taux de réussite ni verdict scientifique n’est calculé.'
    }),
    limitations: Object.freeze([
      'La source historique reste development-only.',
      'Le modèle trimestriel utilise l’hypothèse agrégée du preset et non une modélisation instrument par instrument.',
      'Les actifs simulés restent sans matrice de corrélation dans cette version.',
      'Huit fenêtres indépendantes restent un échantillon limité.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(await runBeginnerQuarterlyComparison(), null, 2)}\n`);
}
