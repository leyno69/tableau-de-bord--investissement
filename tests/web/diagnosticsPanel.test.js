import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPECTED_STORAGE_SCHEMA,
  STORAGE_SCHEMA_KEY,
  buildDiagnosticsSnapshot,
  buildSupportReport,
  diagnosticsHealth,
  readStorageVersion
} from '../../diagnostics-panel.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem(key) { return values.has(key) ? values.get(key) : null; } };
}

test('agrège le démarrage, les interactions et le schéma local sans données sensibles', () => {
  const storage = memoryStorage({ [STORAGE_SCHEMA_KEY]: String(EXPECTED_STORAGE_SCHEMA) });
  const snapshot = buildDiagnosticsSnapshot({
    storage,
    version: 'commit-test',
    boot: { phase: 'ready', errors: [{ source: 'test', message: 'erreur filtrée' }] },
    interaction: { status: 'degraded', issues: ['missing-button'] }
  });

  assert.equal(snapshot.version, 'commit-test');
  assert.equal(snapshot.bootPhase, 'ready');
  assert.equal(snapshot.bootErrors.length, 1);
  assert.equal(snapshot.interactionStatus, 'degraded');
  assert.deepEqual(snapshot.interactionIssues, ['missing-button']);
  assert.equal(snapshot.storageVersion, EXPECTED_STORAGE_SCHEMA);
});

test('signale un stockage absent ou non versionné', () => {
  assert.equal(readStorageVersion(null), null);
  assert.equal(readStorageVersion(memoryStorage()), 0);
});

test('classe un diagnostic entièrement sain comme opérationnel', () => {
  const snapshot = buildDiagnosticsSnapshot({
    storage: memoryStorage({ [STORAGE_SCHEMA_KEY]: String(EXPECTED_STORAGE_SCHEMA) }),
    version: 'test',
    boot: { phase: 'ready', errors: [] },
    interaction: { status: 'ok', issues: [] }
  });

  assert.equal(diagnosticsHealth(snapshot), 'ok');
  assert.match(buildSupportReport(snapshot), /État global : ok/);
});

test('produit un rapport minimal sans données de portefeuille ni secrets', () => {
  const snapshot = buildDiagnosticsSnapshot({
    storage: memoryStorage({ [STORAGE_SCHEMA_KEY]: '1' }),
    version: 'test',
    boot: { phase: 'storage-ready', errors: [] },
    interaction: { status: 'degraded', issues: ['missing-control'] }
  });
  const report = buildSupportReport(snapshot);

  assert.equal(diagnosticsHealth(snapshot), 'attention');
  assert.match(report, /Stockage : 1\/2/);
  assert.match(report, /Anomalies d’interaction : 1/);
  assert.doesNotMatch(report, /portfolio|token|secret|api[_-]?key/i);
});
