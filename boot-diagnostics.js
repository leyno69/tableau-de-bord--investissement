const MAX_ERRORS = 8;
const state = {
  phase: 'initializing',
  startedAt: new Date().toISOString(),
  errors: []
};

function sanitize(value) {
  const text = String(value || 'Erreur inconnue');
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [masqué]')
    .replace(/(?:api[_-]?key|token|secret)=?[^\s&]+/gi, '$1=[masqué]')
    .slice(0, 500);
}

function recordBootError(error, source = 'runtime') {
  const entry = Object.freeze({
    source,
    message: sanitize(error?.message || error),
    at: new Date().toISOString()
  });
  state.errors = [...state.errors.slice(-(MAX_ERRORS - 1)), entry];
  publish();
  return entry;
}

function setBootPhase(phase) {
  state.phase = String(phase || 'unknown');
  publish();
}

function publish() {
  globalThis.__LEYNOR_BOOT__ = Object.freeze({
    phase: state.phase,
    startedAt: state.startedAt,
    errorCount: state.errors.length,
    errors: Object.freeze([...state.errors])
  });
}

function installGlobalBootDiagnostics() {
  globalThis.addEventListener?.('error', event => {
    recordBootError(event.error || event.message, 'window.error');
  });
  globalThis.addEventListener?.('unhandledrejection', event => {
    recordBootError(event.reason, 'unhandledrejection');
  });
  publish();
}

installGlobalBootDiagnostics();

export { recordBootError, setBootPhase };
