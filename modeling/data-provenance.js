export const PROVENANCE_SCHEMA_VERSION = '1.0.0';

export function createDataProvenance({
  provider,
  dataset,
  providerSymbol,
  sourceUrl = null,
  collectedAt = new Date().toISOString(),
  availableAt = null,
  firstObservationAt = null,
  lastObservationAt = null,
  rowCount = null,
  checksum = null,
  license = null,
  pipelineVersion = null,
  metadata = {}
}) {
  if (!provider) throw new Error('provider est requis.');
  if (!dataset) throw new Error('dataset est requis.');
  if (!providerSymbol) throw new Error('providerSymbol est requis.');

  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    provider: String(provider),
    dataset: String(dataset),
    providerSymbol: String(providerSymbol).trim().toUpperCase(),
    sourceUrl,
    collectedAt,
    availableAt,
    firstObservationAt,
    lastObservationAt,
    rowCount,
    checksum,
    license,
    pipelineVersion,
    metadata: { ...metadata }
  };
}

export function validateProvenance(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return { valid: false, errors: ['Record absent.'] };
  if (record.schemaVersion !== PROVENANCE_SCHEMA_VERSION) errors.push('Version de schéma inconnue.');
  for (const key of ['provider', 'dataset', 'providerSymbol', 'collectedAt']) {
    if (!record[key]) errors.push(`${key} manquant.`);
  }
  for (const key of ['collectedAt', 'availableAt', 'firstObservationAt', 'lastObservationAt']) {
    if (record[key] && Number.isNaN(new Date(record[key]).getTime())) errors.push(`${key} invalide.`);
  }
  if (record.rowCount != null && (!Number.isInteger(record.rowCount) || record.rowCount < 0)) {
    errors.push('rowCount invalide.');
  }
  return { valid: errors.length === 0, errors };
}

export function assertPointInTimeAvailability(provenance, asOf) {
  const validation = validateProvenance(provenance);
  if (!validation.valid) throw new Error(`Provenance invalide: ${validation.errors.join(' ')}`);
  const cutoff = new Date(asOf);
  if (Number.isNaN(cutoff.getTime())) throw new Error('asOf invalide.');
  if (!provenance.availableAt) return { usable: false, reason: 'availableAt manquant' };
  const available = new Date(provenance.availableAt);
  return available <= cutoff
    ? { usable: true, reason: null }
    : { usable: false, reason: `Donnée disponible seulement à ${provenance.availableAt}` };
}
