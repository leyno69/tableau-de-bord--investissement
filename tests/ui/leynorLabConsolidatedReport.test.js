import test from 'node:test';
import assert from 'node:assert/strict';
import { LabReportCatalog } from '../../leynor-lab-report-catalog.js';
import {
  buildLabConsolidatedPdf,
  createLabConsolidatedPremiumReport
} from '../../leynor-lab-consolidated-report.js';

function premiumReport(label) {
  return {
    title: `Rapport ${label}`,
    generatedAt: '2026-08-02T10:00:00Z',
    methodology: 'Simulation déterministe documentée.',
    sections: [{ title: 'Résultats', lines: ['Médiane documentée'] }],
    assumptions: ['Hypothèse test'],
    limitations: ['Limite test']
  };
}

function catalog() {
  return new LabReportCatalog([
    {
      simulationId: 'sim-002',
      reproducibilityId: 'lab-v6:sim-002:22',
      campaignId: 'wave-6-resilience',
      generatedAt: '2026-08-02T11:00:00Z',
      engineVersion: 'lab-v6',
      seed: 22,
      report: premiumReport('2'),
      pdf: { filename: 'sim-002.pdf', mimeType: 'application/pdf', size: 1200 }
    },
    {
      simulationId: 'sim-001',
      reproducibilityId: 'lab-v6:sim-001:11',
      campaignId: 'wave-6-resilience',
      generatedAt: '2026-08-02T10:00:00Z',
      engineVersion: 'lab-v6',
      seed: 11,
      report: premiumReport('1'),
      pdf: null
    },
    {
      simulationId: 'outside',
      reproducibilityId: 'lab-v6:outside:99',
      campaignId: 'other-campaign',
      generatedAt: '2026-08-02T09:00:00Z',
      engineVersion: 'lab-v6',
      seed: 99,
      report: premiumReport('hors campagne'),
      pdf: null
    }
  ]);
}

test('assemble uniquement les rapports de la campagne avec une traçabilité complète', () => {
  const report = createLabConsolidatedPremiumReport({
    catalog: catalog(),
    campaignId: 'wave-6-resilience',
    generatedAt: '2026-08-02T12:00:00Z'
  });
  const text = JSON.stringify(report);

  assert.match(report.title, /Rapport consolidé LEYNOR AI/);
  assert.match(text, /Rapports individuels : 2/);
  assert.match(text, /sim-001/);
  assert.match(text, /sim-002/);
  assert.doesNotMatch(text, /outside|hors campagne/);
  assert.match(text, /Aucun score IGL|aucun score IGL/i);
  assert.match(text, /niveau de confiance consolidé reste à calculer/i);
});

test('le rapport et le PDF sont déterministes', () => {
  const input = {
    catalog: catalog(),
    campaignId: 'wave-6-resilience',
    generatedAt: '2026-08-02T12:00:00Z'
  };
  assert.deepEqual(
    createLabConsolidatedPremiumReport(input),
    createLabConsolidatedPremiumReport(input)
  );
  const first = buildLabConsolidatedPdf(input);
  const second = buildLabConsolidatedPdf(input);
  assert.deepEqual(first, second);
  assert.equal(new TextDecoder().decode(first.slice(0, 8)), '%PDF-1.4');
});

test('refuse une campagne vide ou un catalogue invalide', () => {
  assert.throws(
    () => createLabConsolidatedPremiumReport({
      catalog: catalog(),
      campaignId: 'missing',
      generatedAt: '2026-08-02T12:00:00Z'
    }),
    /Aucun rapport individuel/
  );
  assert.throws(
    () => createLabConsolidatedPremiumReport({
      catalog: {},
      campaignId: 'wave-6-resilience',
      generatedAt: '2026-08-02T12:00:00Z'
    }),
    /catalog doit exposer une méthode list/
  );
});
