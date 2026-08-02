import test from 'node:test';
import assert from 'node:assert/strict';
import { LabReportCatalog, createLabReportEntry } from '../../leynor-lab-report-catalog.js';
import { createLabIndividualPremiumReport } from '../../leynor-lab-individual-report.js';

function report(seed = 42) {
  return createLabIndividualPremiumReport({
    generatedAt: '2026-08-02T13:00:00+02:00',
    simulationId: `simulation-${seed}`,
    seed,
    engineVersion: 'lab-v6.1',
    result: {
      label: 'Résilience',
      type: 'independent',
      report: {
        methodology: 'Monte-Carlo déterministe.',
        summary: {
          portfolioCount: 10000,
          contributed: 48000,
          nominal: { p05: 50000, median: 90000, p95: 160000 },
          realMedian: 72000,
          drawdown: { median: 0.18, p95: 0.4 },
          goalProbability: 0.61
        }
      }
    },
    parameters: { horizonYears: 20, initialCapital: 10000, monthlyContribution: 200 },
    confidence: 'à confirmer entre graines',
    evidence: 'simulation indépendante'
  });
}

function entry(seed = 42, campaignId = 'campaign-resilience') {
  return {
    simulationId: `simulation-${seed}`,
    reproducibilityId: `lab-v6.1:simulation-${seed}:${seed}`,
    campaignId,
    generatedAt: '2026-08-02T13:00:00+02:00',
    engineVersion: 'lab-v6.1',
    seed,
    report: report(seed),
    pdf: { filename: `simulation-${seed}.pdf`, mimeType: 'application/pdf', size: 2048 }
  };
}

test('catalogue un rapport individuel avec ses métadonnées reproductibles', () => {
  const catalog = new LabReportCatalog();
  const stored = catalog.add(entry());

  assert.equal(catalog.size, 1);
  assert.equal(stored.reproducibilityId, 'lab-v6.1:simulation-42:42');
  assert.equal(catalog.get(stored.reproducibilityId), stored);
  assert.equal(stored.pdf.mimeType, 'application/pdf');
  assert.ok(Object.isFrozen(stored));
  assert.ok(Object.isFrozen(stored.report));
});

test('une réinsertion identique est idempotente mais un conflit est refusé', () => {
  const catalog = new LabReportCatalog([entry()]);
  const first = catalog.get('lab-v6.1:simulation-42:42');
  const second = catalog.add(entry());
  assert.equal(second, first);
  assert.equal(catalog.size, 1);

  assert.throws(
    () => catalog.add({ ...entry(), engineVersion: 'lab-v6.2' }),
    /Conflit de rapport/
  );
});

test('liste les rapports de façon déterministe et filtre par campagne', () => {
  const later = {
    ...entry(84, 'campaign-diversification'),
    generatedAt: '2026-08-03T10:00:00+02:00'
  };
  const catalog = new LabReportCatalog([later, entry(42), entry(21)]);

  assert.deepEqual(
    catalog.list().map(item => item.simulationId),
    ['simulation-21', 'simulation-42', 'simulation-84']
  );
  assert.deepEqual(
    catalog.list({ campaignId: 'campaign-resilience' }).map(item => item.simulationId),
    ['simulation-21', 'simulation-42']
  );
});

test('sérialise et restaure le catalogue sans perte ni mutation', () => {
  const catalog = new LabReportCatalog([entry(42), entry(84)]);
  const snapshot = catalog.toJSON();
  const restored = LabReportCatalog.fromJSON(JSON.parse(JSON.stringify(snapshot)));

  assert.deepEqual(restored.toJSON(), snapshot);
  assert.equal(restored.size, 2);
  assert.ok(Object.isFrozen(snapshot));
});

test('refuse les rapports incomplets et les snapshots incompatibles', () => {
  assert.throws(() => createLabReportEntry({ ...entry(), report: null }), /rapport Premium complet/);
  assert.throws(() => createLabReportEntry({ ...entry(), seed: 1.5 }), /entier sûr/);
  assert.throws(() => LabReportCatalog.fromJSON({ schemaVersion: 2, entries: [] }), /invalide ou incompatible/);
});
