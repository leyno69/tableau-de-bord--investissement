import { readFile, writeFile } from 'node:fs/promises';
import { diagnoseHistoricalCoverage } from '../../validation/historicalCoverageDiagnostics.js';

const simulation = JSON.parse(await readFile(new URL('./results.json', import.meta.url), 'utf8'));
const historical = JSON.parse(await readFile(new URL('./rolling-costs-results-dev.json', import.meta.url), 'utf8'));
const simulationForCoverage = Object.freeze({ ...simulation.summary, drawdownSamplingFrequency: 'monthly' });

const diagnostics = historical.windows.map(window => {
  const finalValue = simulation.definition.initialAmount * (1 + window.returnZeroCost);
  const matchedDrawdown = window.maxDrawdownMonthlyMatched ?? window.maxDrawdown;
  return Object.freeze({
    id: window.id,
    effectiveStart: window.effectiveStart,
    effectiveEnd: window.effectiveEnd,
    dailyDrawdown: window.maxDrawdownDaily ?? window.maxDrawdown,
    monthlyMatchedDrawdown: matchedDrawdown,
    diagnostic: diagnoseHistoricalCoverage({
      simulation: simulationForCoverage,
      historical: { finalValue, maxDrawdown: -matchedDrawdown, drawdownSamplingFrequency: 'monthly' }
    })
  });
});

const output = Object.freeze({
  schemaVersion: 2,
  experimentId: 'beginner-historical-coverage-diagnostics-v1',
  status: 'descriptive-development-diagnostic',
  drawdownComparisonFrequency: 'monthly',
  diagnostics: Object.freeze(diagnostics),
  counts: Object.freeze({
    finalValueBands: diagnostics.reduce((acc, item) => {
      const band = item.diagnostic.finalValue.band;
      acc[band] = (acc[band] ?? 0) + 1;
      return acc;
    }, {}),
    drawdownBands: diagnostics.reduce((acc, item) => {
      const band = item.diagnostic.drawdown.band;
      acc[band] = (acc[band] ?? 0) + 1;
      return acc;
    }, {})
  }),
  verdict: null,
  limitation: 'Les fenêtres historiques se chevauchent et la source de marché est development-only ; ces comptages ne sont pas des fréquences de couverture calibrées. Le drawdown quotidien est conservé séparément et n’est pas comparé aux percentiles mensuels.'
});

await writeFile(new URL('./coverage-diagnostics-dev.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
