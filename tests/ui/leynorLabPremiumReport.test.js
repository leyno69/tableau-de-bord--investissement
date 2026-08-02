import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPremiumPdf } from '../../premium-pdf-export.js';
import { runLabBatch } from '../../leynor-lab-batch.js';
import { createLabBatchPremiumReport } from '../../leynor-lab-premium-report.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const definition = {
  name: 'Étude de résilience',
  jobs: [
    {
      id: 'base',
      label: 'Scénario de base',
      type: 'independent',
      definition: {
        portfolioCount: 20,
        years: 5,
        initialAmount: 5000,
        monthlyContribution: 100,
        annualInflation: 0.02,
        annualFees: 0.002,
        goal: 15000,
        seed: 12,
        allocation
      }
    }
  ]
};

test('construit un rapport laboratoire explicite sans classement arbitraire', async () => {
  const batch = await runLabBatch(definition, { yieldControl: async () => {} });
  const report = createLabBatchPremiumReport(batch, { generatedAt: '2026-08-02' });

  assert.equal(report.title, 'Rapport Laboratoire LEYNOR AI — Étude de résilience');
  assert.equal(report.sections.length, 1);
  assert.match(report.sections[0].lines.join(' '), /Percentile 5/i);
  assert.match(report.methodology, /ne désignent aucun scénario comme meilleur/);
  assert.doesNotMatch(JSON.stringify(report), /score LEYNOR/i);
  assert.ok(Object.isFrozen(report));
});

test('le rapport laboratoire génère un vrai PDF', async () => {
  const batch = await runLabBatch(definition, { yieldControl: async () => {} });
  const report = createLabBatchPremiumReport(batch, { generatedAt: '2026-08-02' });
  const bytes = buildPremiumPdf(report);
  const text = new TextDecoder().decode(bytes);

  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /Rapport Laboratoire LEYNOR AI/);
  assert.match(text, /%%EOF$/);
});

test('refuse un rapport incomplet ou sans date explicite', () => {
  assert.throws(() => createLabBatchPremiumReport({}, { generatedAt: '2026-08-02' }), /rapport de lot/);
  assert.throws(() => createLabBatchPremiumReport({ definition: { name: 'X' }, results: [{}] }, { generatedAt: '' }), /generatedAt/);
});
