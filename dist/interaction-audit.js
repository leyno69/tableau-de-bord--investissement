import { recordBootError, setBootPhase } from './boot-diagnostics.js';

const REQUIRED_CONTROLS = Object.freeze([
  ['brokerSelect', 'select'],
  ['refreshBtn', 'button'],
  ['addPositionBtn', 'button'],
  ['addWatchBtn', 'button'],
  ['positionDialog', 'dialog'],
  ['watchDialog', 'dialog']
]);

function auditInteractions(documentRef = globalThis.document) {
  if (!documentRef) return Object.freeze({ healthy: false, issues: Object.freeze(['document-unavailable']) });
  const issues = [];
  for (const [id, tag] of REQUIRED_CONTROLS) {
    const element = documentRef.getElementById(id);
    if (!element) issues.push(`missing:${id}`);
    else if (element.tagName?.toLowerCase() !== tag) issues.push(`invalid-tag:${id}`);
  }
  documentRef.querySelectorAll('.main-nav a[href^="#"]').forEach(link => {
    const target = link.getAttribute('href')?.slice(1);
    if (target && !documentRef.getElementById(target)) issues.push(`missing-target:${target}`);
  });
  if (issues.length) {
    recordBootError(new Error(`Contrôles interactifs incomplets: ${issues.join(', ')}`), 'interaction-audit');
    setBootPhase('interaction-degraded');
  } else {
    setBootPhase('interactive');
  }
  return Object.freeze({ healthy: issues.length === 0, issues: Object.freeze(issues) });
}

function scheduleInteractionAudit() {
  const run = () => globalThis.setTimeout?.(() => auditInteractions(), 0);
  if (globalThis.document?.readyState === 'loading') {
    globalThis.document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

scheduleInteractionAudit();

export { REQUIRED_CONTROLS, auditInteractions };
