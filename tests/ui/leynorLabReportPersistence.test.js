import test from 'node:test';
import assert from 'node:assert/strict';
import { LabReportCatalog } from '../../leynor-lab-report-catalog.js';
import { LabReportCatalogStore } from '../../leynor-lab-report-persistence.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    dump: () => Object.fromEntries(values)
  };
}

function entry(id = 'sim-1') {
  return {
    simulationId: id,
    reproducibilityId: `engine:${id}:42`,
    campaignId: 'campaign-1',
    generatedAt: '2026-08-02T12:00:00+02:00',
    engineVersion: 'engine',
    seed: 42,
    report: { title: 'Rapport', generatedAt: '2026-08-02', methodology: 'Méthode', sections: [{ title: 'Résultats', lines: ['Ligne'] }], assumptions: [], limitations: [] },
    pdf: { filename: `${id}.pdf`, mimeType: 'application/pdf', size: 128 }
  };
}

test('sauvegarde puis restaure un catalogue complet', () => {
  const storage = memoryStorage();
  const store = new LabReportCatalogStore({ storage });
  const catalog = new LabReportCatalog([entry()]);
  const receipt = store.save(catalog);
  assert.equal(receipt.entries, 1);
  assert.ok(receipt.bytes > 0);
  assert.deepEqual(store.load().toJSON(), catalog.toJSON());
});

test('add est durable et reste idempotent', () => {
  const storage = memoryStorage();
  const store = new LabReportCatalogStore({ storage });
  store.add(entry());
  store.add(entry());
  assert.equal(store.load().size, 1);
});

test('refuse les données corrompues sans les effacer silencieusement', () => {
  const storage = memoryStorage({ 'leynor.lab.reports.v1': '{bad-json' });
  const store = new LabReportCatalogStore({ storage });
  assert.throws(() => store.load(), /corrompu ou incompatible/);
  assert.equal(storage.dump()['leynor.lab.reports.v1'], '{bad-json');
});

test('clear supprime uniquement le catalogue ciblé', () => {
  const storage = memoryStorage({ other: 'keep' });
  const store = new LabReportCatalogStore({ storage });
  store.add(entry());
  store.clear();
  assert.equal(store.load().size, 0);
  assert.equal(storage.dump().other, 'keep');
});

test('valide le contrat de stockage et le catalogue', () => {
  assert.throws(() => new LabReportCatalogStore({ storage: {} }), /getItem/);
  const store = new LabReportCatalogStore({ storage: memoryStorage() });
  assert.throws(() => store.save({}), /LabReportCatalog/);
});
