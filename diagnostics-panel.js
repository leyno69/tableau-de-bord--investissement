import { CURRENT_STORAGE_SCHEMA, STORAGE_KEYS } from './storage-bootstrap.js';

const STORAGE_SCHEMA_KEY = STORAGE_KEYS.schema;
const EXPECTED_STORAGE_SCHEMA = CURRENT_STORAGE_SCHEMA;

function readStorageVersion(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  const value = Number(storage.getItem(STORAGE_SCHEMA_KEY));
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function buildDiagnosticsSnapshot({
  boot = globalThis.__LEYNOR_BOOT__,
  interaction = globalThis.__LEYNOR_INTERACTIONS__,
  storage = globalThis.localStorage,
  version = globalThis.__LEYNOR_VERSION__ || 'non renseignée'
} = {}) {
  return Object.freeze({
    version: String(version),
    bootPhase: boot?.phase || 'inconnue',
    bootErrors: Array.isArray(boot?.errors) ? boot.errors : [],
    interactionStatus: interaction?.status || 'non audité',
    interactionIssues: Array.isArray(interaction?.issues) ? interaction.issues : [],
    storageVersion: readStorageVersion(storage),
    expectedStorageVersion: EXPECTED_STORAGE_SCHEMA
  });
}

function diagnosticsHealth(snapshot) {
  const storageHealthy = snapshot.storageVersion === snapshot.expectedStorageVersion;
  const interactionsHealthy = snapshot.interactionStatus === 'ok' && snapshot.interactionIssues.length === 0;
  const bootHealthy = snapshot.bootErrors.length === 0;
  return bootHealthy && interactionsHealthy && storageHealthy ? 'ok' : 'attention';
}

function buildSupportReport(snapshot = buildDiagnosticsSnapshot()) {
  return [
    'LEYNOR — Rapport de diagnostic',
    `Version : ${snapshot.version}`,
    `Démarrage : ${snapshot.bootPhase}`,
    `Erreurs de démarrage : ${snapshot.bootErrors.length}`,
    `Interactions : ${snapshot.interactionStatus}`,
    `Anomalies d’interaction : ${snapshot.interactionIssues.length}`,
    `Stockage : ${snapshot.storageVersion ?? 'indisponible'}/${snapshot.expectedStorageVersion}`,
    `État global : ${diagnosticsHealth(snapshot)}`
  ].join('\n');
}

function ensureDiagnosticsStyles(root) {
  if (!root?.head || root.getElementById('leynor-diagnostics-styles')) return;
  const link = root.createElement('link');
  link.id = 'leynor-diagnostics-styles';
  link.rel = 'stylesheet';
  link.href = './diagnostics-panel.css';
  root.head.append(link);
}

function renderDiagnosticsPanel(root = document) {
  if (!root?.body || root.getElementById('leynor-diagnostics')) return null;
  ensureDiagnosticsStyles(root);

  const details = root.createElement('details');
  details.id = 'leynor-diagnostics';
  details.className = 'leynor-diagnostics';
  details.innerHTML = `
    <summary>Diagnostic de l’application <span data-diagnostic-status></span></summary>
    <div class="leynor-diagnostics__content">
      <dl data-diagnostic-summary></dl>
      <details class="leynor-diagnostics__technical">
        <summary>Détails techniques</summary>
        <pre aria-live="polite"></pre>
      </details>
      <button type="button" data-copy-diagnostics>Copier le rapport</button>
      <span role="status" aria-live="polite" data-copy-status></span>
    </div>`;

  const refresh = () => {
    const snapshot = buildDiagnosticsSnapshot();
    const health = diagnosticsHealth(snapshot);
    details.dataset.health = health;
    details.querySelector('[data-diagnostic-status]').textContent = health === 'ok' ? 'OK' : 'À vérifier';
    details.querySelector('[data-diagnostic-summary]').innerHTML = `
      <div><dt>Démarrage</dt><dd>${snapshot.bootPhase}</dd></div>
      <div><dt>Interactions</dt><dd>${snapshot.interactionStatus}</dd></div>
      <div><dt>Stockage</dt><dd>${snapshot.storageVersion ?? 'indisponible'} / ${snapshot.expectedStorageVersion}</dd></div>
      <div><dt>Erreurs</dt><dd>${snapshot.bootErrors.length + snapshot.interactionIssues.length}</dd></div>`;
    details.querySelector('pre').textContent = JSON.stringify(snapshot, null, 2);
    return snapshot;
  };

  details.addEventListener('toggle', () => { if (details.open) refresh(); });
  details.querySelector('[data-copy-diagnostics]').addEventListener('click', async () => {
    const status = details.querySelector('[data-copy-status]');
    try {
      await globalThis.navigator?.clipboard?.writeText(buildSupportReport(refresh()));
      status.textContent = 'Rapport copié.';
    } catch {
      status.textContent = 'Copie indisponible.';
    }
  });

  refresh();
  root.body.append(details);
  return details;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderDiagnosticsPanel(document), { once: true });
  } else {
    renderDiagnosticsPanel(document);
  }
}

export {
  EXPECTED_STORAGE_SCHEMA,
  STORAGE_SCHEMA_KEY,
  buildDiagnosticsSnapshot,
  buildSupportReport,
  diagnosticsHealth,
  readStorageVersion,
  renderDiagnosticsPanel
};
