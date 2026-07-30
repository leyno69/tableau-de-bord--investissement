import { validateProvenance } from './data-provenance.js';
import { buildTimeSafeDataset } from './historical-pipeline.js';

export async function fetchHistoricalEod(symbol, { from = null, to = null } = {}) {
  const params = new URLSearchParams({ symbol: String(symbol || '').trim().toUpperCase() });
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const response = await fetch(`/.netlify/functions/historical-eod?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Historique indisponible (${response.status}).`);

  const provenanceValidation = validateProvenance(payload.provenance);
  if (!provenanceValidation.valid) {
    throw new Error(`Provenance EOD invalide : ${provenanceValidation.errors.join(' ')}`);
  }
  if (!Array.isArray(payload.rows)) throw new Error('Historique EOD absent.');
  if (payload.provenance.rowCount !== payload.rows.length) throw new Error('Nombre de lignes incohérent avec la provenance.');

  const checksumHeader = response.headers.get('X-Data-Checksum');
  if (!checksumHeader || checksumHeader !== payload.provenance.checksum) {
    throw new Error('Checksum de provenance incohérent.');
  }

  return payload;
}

export async function loadTimeSafeEodDataset(symbol, options = {}) {
  const source = await fetchHistoricalEod(symbol, options);
  const dataset = buildTimeSafeDataset(source.rows, { requireExplicitAvailability: true });
  if (!dataset.audit.valid) {
    throw new Error(`Historique rejeté : ${dataset.audit.issues.map(issue => issue.type).join(', ')}`);
  }

  return {
    symbol: source.symbol,
    provenance: source.provenance,
    sourceAudit: source.audit,
    datasetAudit: dataset.audit,
    observations: dataset.observations
  };
}
