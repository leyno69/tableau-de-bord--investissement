import { createHash } from 'node:crypto';
import { normalizeEodRows, auditPriceHistory } from '../../modeling/historical-pipeline.js';
import { createDataProvenance, validateProvenance } from '../../modeling/data-provenance.js';

const PIPELINE_VERSION = 'eod-ingestion-v1';
const SYMBOL_PATTERN = /^[A-Z0-9._-]{1,40}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value, name) {
  if (!value) return null;
  if (!DATE_PATTERN.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${name} invalide. Format attendu : YYYY-MM-DD.`);
  }
  return value;
}

function checksumRows(rows) {
  return `sha256:${createHash('sha256').update(JSON.stringify(rows)).digest('hex')}`;
}

function conservativeAvailableAt(lastObservationAt) {
  // EODHD fournit une date de séance mais pas, dans cette réponse, l'horodatage exact
  // de publication de la barre EOD. On utilise donc la fin UTC de la date de séance,
  // volontairement conservatrice pour les backtests journaliers.
  return lastObservationAt ? `${lastObservationAt}T23:59:59.999Z` : null;
}

export default async (request) => {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Clé API EODHD absente côté serveur.' }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const symbol = String(url.searchParams.get('symbol') || '').trim().toUpperCase();
    const from = validateDate(url.searchParams.get('from'), 'from');
    const to = validateDate(url.searchParams.get('to'), 'to');

    if (!SYMBOL_PATTERN.test(symbol)) {
      return Response.json({ error: 'Symbole de marché invalide.' }, { status: 400 });
    }
    if (from && to && from > to) {
      return Response.json({ error: '`from` doit être antérieur ou égal à `to`.' }, { status: 400 });
    }

    const params = new URLSearchParams({
      api_token: apiKey,
      fmt: 'json',
      period: 'd',
      order: 'a'
    });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const providerUrl = `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}?${params.toString()}`;
    const response = await fetch(providerUrl, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(data)) {
      const providerMessage = data?.message || data?.error || `Réponse EODHD invalide (${response.status}).`;
      return Response.json({ error: providerMessage }, { status: response.ok ? 502 : response.status });
    }

    const rows = normalizeEodRows(data);
    const audit = auditPriceHistory(rows);
    if (!audit.valid) {
      return Response.json({ error: 'Historique EOD rejeté par le contrôle qualité.', audit }, { status: 502 });
    }

    const collectedAt = new Date().toISOString();
    const checksum = checksumRows(rows);
    const sourceUrl = `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}`;
    const provenance = createDataProvenance({
      provider: 'EODHD',
      dataset: 'historical-eod-daily',
      providerSymbol: symbol,
      sourceUrl,
      collectedAt,
      availableAt: conservativeAvailableAt(audit.lastDate),
      firstObservationAt: audit.firstDate,
      lastObservationAt: audit.lastDate,
      rowCount: rows.length,
      checksum,
      pipelineVersion: PIPELINE_VERSION,
      metadata: {
        requestedFrom: from,
        requestedTo: to,
        period: 'd',
        order: 'a',
        availabilityPolicy: 'session-date-end-utc-conservative',
        availabilityPrecision: 'day',
        providerPublicationTimestampKnown: false
      }
    });

    const provenanceValidation = validateProvenance(provenance);
    if (!provenanceValidation.valid) {
      return Response.json({ error: 'Provenance invalide.', details: provenanceValidation.errors }, { status: 500 });
    }

    return Response.json(
      {
        symbol,
        rows,
        audit,
        provenance
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Data-Checksum': checksum
        }
      }
    );
  } catch (error) {
    console.error('Historical EOD ingestion error:', error);
    return Response.json({ error: error.message || 'Impossible de récupérer l’historique EOD.' }, { status: 502 });
  }
};
