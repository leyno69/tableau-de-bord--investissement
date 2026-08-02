import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPremiumPdf } from '../../premium-pdf-export.js';
import { createSimulationPremiumReport } from '../../simulation-premium-report.js';

const input = {
  generatedAt: '2026-08-02',
  parameters: {
    initialDeposit: 10000,
    monthlyContribution: 250,
    years: 20,
    assumedReturn: 0.07
  },
  results: {
    medianFinalValue: 180000,
    p10: 110000,
    p90: 290000,
    maxDrawdown: 0.32,
    goalProbability: 0.64
  },
  confidence: 'moyen',
  evidence: 'provisoire'
};

test('construit un rapport de simulation explicite et immuable', () => {
  const report = createSimulationPremiumReport(input);
  assert.equal(Object.isFrozen(report), true);
  assert.match(report.methodology, /ne constituent pas une prévision/);
  assert.match(report.sections[1].lines.join(' '), /Percentile 10/);
  assert.match(report.sections[1].lines.join(' '), /64\.0 %/);
});

test('le rapport de simulation génère un vrai PDF', () => {
  const bytes = buildPremiumPdf(createSimulationPremiumReport(input));
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /Rapport de simulation LEYNOR AI/);
  assert.match(text, /%%EOF$/);
});

test('refuse des percentiles incohérents', () => {
  assert.throws(() => createSimulationPremiumReport({
    ...input,
    results: { ...input.results, p10: 200000 }
  }), /p10 <= médiane <= p90/);
});

test('refuse une probabilité hors bornes', () => {
  assert.throws(() => createSimulationPremiumReport({
    ...input,
    results: { ...input.results, goalProbability: 1.2 }
  }), /compris entre 0 et 1/);
});
