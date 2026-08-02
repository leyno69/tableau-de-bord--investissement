import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabIndividualPremiumReport } from '../../leynor-lab-individual-report.js';
import { generatePremiumPdf } from '../../premium-pdf-export.js';

function simulationResult() {
  return {
    label: 'Résilience — retrait forcé',
    type: 'correlated',
    report: {
      methodology: 'Monte-Carlo mensuel déterministe avec matrice de corrélation explicite.',
      summary: {
        portfolioCount: 10000,
        contributed: 48000,
        nominal: { p05: 52000, median: 91000, p95: 168000 },
        realMedian: 73000,
        drawdown: { median: 0.18, p95: 0.42 },
        goalProbability: 0.64
      }
    }
  };
}

const input = {
  generatedAt: '2026-08-02T12:45:00+02:00',
  simulationId: 'resilience-withdrawal-001',
  seed: 424242,
  engineVersion: 'lab-v6.1',
  result: simulationResult(),
  parameters: {
    horizonYears: 20,
    initialCapital: 10000,
    monthlyContribution: 200,
    inflation: 0.02
  },
  events: [
    { type: 'retrait forcé', month: 36, amount: 5000 },
    { type: 'interruption des versements', month: 37 }
  ],
  confidence: 'à confirmer entre graines',
  evidence: 'simulation déterministe documentée'
};

test('le rapport individuel conserve la traçabilité et les résultats exhaustifs', () => {
  const report = createLabIndividualPremiumReport(input);
  const text = JSON.stringify(report);

  assert.match(report.title, /Rapport individuel LEYNOR AI/);
  assert.match(text, /resilience-withdrawal-001/);
  assert.match(text, /lab-v6\.1:resilience-withdrawal-001:424242/);
  assert.match(text, /10.?000/);
  assert.match(text, /Percentile 5|percentile 5/i);
  assert.match(text, /Drawdown percentile 95/);
  assert.match(text, /retrait forcé au mois 36/);
  assert.match(text, /Une simulation unique ne suffit pas/);
  assert.doesNotMatch(text, /meilleur scénario|recommandation d’achat|rendement garanti/i);
});

test('le rapport et son PDF sont déterministes pour une entrée identique', () => {
  const first = createLabIndividualPremiumReport(input);
  const second = createLabIndividualPremiumReport(input);
  assert.deepEqual(first, second);

  const firstPdf = generatePremiumPdf(first);
  const secondPdf = generatePremiumPdf(second);
  assert.deepEqual(firstPdf, secondPdf);
  assert.equal(new TextDecoder().decode(firstPdf.slice(0, 8)), '%PDF-1.4');
});

test('le rapport refuse les résultats incohérents', () => {
  const invalid = simulationResult();
  invalid.report.summary.nominal = { p05: 100000, median: 90000, p95: 80000 };

  assert.throws(
    () => createLabIndividualPremiumReport({ ...input, result: invalid }),
    /p05 <= médiane <= p95/
  );

  assert.throws(
    () => createLabIndividualPremiumReport({ ...input, simulationId: '' }),
    /simulationId doit être une chaîne non vide/
  );
});
