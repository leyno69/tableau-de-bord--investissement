const STORAGE_SCHEMA_KEY = 'leynor-storage-schema-version';
const EXPECTED_STORAGE_SCHEMA = 2;

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

function renderDiagnosticsPanel(root = document) {
  if (!root?.body || root.getElementById('leynor-diagnostics')) return null;
  const details = root.createElement('details');
  details.id = 'leynor-diagnostics';
  details.className = 'leynor-diagnostics';
  details.innerHTML = '<summary>Diagnostic de l’application</summary><pre aria-live="polite"></pre>';

  const refresh = () => {
    details.querySelector('pre').textContent = JSON.stringify(buildDiagnosticsSnapshot(), null, 2);
  };
  details.addEventListener('toggle', () => { if (details.open) refresh(); });
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
  readStorageVersion,
  renderDiagnosticsPanel
};
