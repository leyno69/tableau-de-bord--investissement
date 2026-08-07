function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function date(value, field) {
  const normalized = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${field} doit être une date ISO YYYY-MM-DD valide.`);
  }
  return normalized;
}

export function defineHistoricalInstrumentMapping(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const mappingMode = text(input.mappingMode, 'mappingMode');
  if (!['exact-instrument', 'explicit-proxy'].includes(mappingMode)) throw new TypeError('mappingMode invalide.');

  const mapping = {
    schemaVersion: 1,
    sourceTicker: text(input.sourceTicker, 'sourceTicker').toUpperCase(),
    sourcePresetId: text(input.sourcePresetId, 'sourcePresetId'),
    historicalSeriesId: text(input.historicalSeriesId, 'historicalSeriesId'),
    mappingMode,
    instrumentInceptionDate: date(input.instrumentInceptionDate, 'instrumentInceptionDate'),
  };

  if (mappingMode === 'explicit-proxy') {
    mapping.proxyRationale = text(input.proxyRationale, 'proxyRationale');
    mapping.proxyIdentity = text(input.proxyIdentity, 'proxyIdentity');
  }

  return Object.freeze(mapping);
}

export function auditMappingForWindow(mapping, windowStart) {
  const normalized = defineHistoricalInstrumentMapping(mapping);
  const start = date(windowStart, 'windowStart');
  if (normalized.mappingMode === 'exact-instrument' && start < normalized.instrumentInceptionDate) {
    return Object.freeze({ admissible: false, blocker: 'window-predates-instrument-inception' });
  }
  if (normalized.mappingMode === 'explicit-proxy') {
    return Object.freeze({ admissible: true, blocker: null, warning: 'proxy-not-identical-to-original-instrument' });
  }
  return Object.freeze({ admissible: true, blocker: null, warning: null });
}
