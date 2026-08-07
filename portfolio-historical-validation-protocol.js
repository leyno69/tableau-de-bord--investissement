function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function isoDate(value, field) {
  const normalized = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${field} doit être une date ISO YYYY-MM-DD valide.`);
  }
  return normalized;
}

function normalizeWindow(window, index) {
  const purpose = nonEmpty(window?.purpose, `windows[${index}].purpose`);
  if (!['calibration', 'validation', 'locked-test'].includes(purpose)) throw new TypeError(`windows[${index}].purpose est invalide.`);
  const start = isoDate(window.start, `windows[${index}].start`);
  const end = isoDate(window.end, `windows[${index}].end`);
  if (start > end) throw new TypeError(`windows[${index}] doit commencer avant sa fin.`);
  return Object.freeze({ purpose, start, end });
}

function uniqueStrings(values, field) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(`${field} doit être un tableau non vide.`);
  const normalized = values.map((value, index) => nonEmpty(value, `${field}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${field} ne doit pas contenir de doublons.`);
  return Object.freeze(normalized);
}

export const REQUIRED_HISTORICAL_METRICS_V1 = Object.freeze([
  'cumulative-return',
  'annualized-return',
  'volatility',
  'max-drawdown',
  'recovery-duration',
  'crisis-loss',
  'relative-rank-stability',
  'simulation-history-error',
  'predicted-vs-observed-rank',
  'conclusion-inversion-frequency',
]);

export function sealPortfolioHistoricalValidationProtocol(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  if (input.createdWithoutOutcomeAccess !== true) throw new TypeError('createdWithoutOutcomeAccess doit être explicitement true.');

  const windows = (input.windows ?? []).map(normalizeWindow).sort((a, b) => a.start.localeCompare(b.start));
  const purposes = new Set(windows.map(window => window.purpose));
  for (const required of ['calibration', 'validation', 'locked-test']) {
    if (!purposes.has(required)) throw new TypeError(`fenêtre ${required} obligatoire.`);
  }
  for (let index = 1; index < windows.length; index += 1) {
    if (windows[index - 1].end >= windows[index].start) throw new TypeError('les fenêtres historiques ne doivent pas se chevaucher.');
  }

  const metrics = uniqueStrings(input.metrics, 'metrics');
  for (const required of REQUIRED_HISTORICAL_METRICS_V1) {
    if (!metrics.includes(required)) throw new TypeError(`métrique obligatoire absente: ${required}`);
  }

  return Object.freeze({
    schemaVersion: 1,
    protocolId: nonEmpty(input.protocolId, 'protocolId'),
    methodologyVersion: nonEmpty(input.methodologyVersion, 'methodologyVersion'),
    datasetPolicyId: nonEmpty(input.datasetPolicyId, 'datasetPolicyId'),
    benchmarkPolicyId: nonEmpty(input.benchmarkPolicyId, 'benchmarkPolicyId'),
    windows: Object.freeze(windows),
    metrics,
    refutationRules: uniqueStrings(input.refutationRules, 'refutationRules'),
    status: 'sealed',
    createdWithoutOutcomeAccess: true,
  });
}
