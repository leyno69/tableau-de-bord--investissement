import { HttpMarketDataProvider } from '../HttpMarketDataProvider.js';

const ENDPOINT = 'https://hist.databento.com/v0/timeseries.get_range';
const ALLOWED_SCHEMAS = new Set(['ohlcv-1s', 'ohlcv-1m', 'ohlcv-1h', 'ohlcv-1d']);

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function toBasicAuth(apiKey) {
  const key = required(apiKey, 'apiKey');
  return `Basic ${Buffer.from(`${key}:`, 'utf8').toString('base64')}`;
}

function mapRow(row, query) {
  const observedAt = row.ts_event ?? row.hd?.ts_event;
  return {
    symbol: row.symbol ?? query.symbol,
    observedAt,
    availableAt: row.ts_recv ?? observedAt,
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: row.volume == null ? null : Number(row.volume),
    sourceRevision: row.sequence == null ? null : String(row.sequence),
  };
}

export function createDatabentoProvider({ apiKey, fetchImpl = globalThis.fetch, timeoutMs } = {}) {
  const authorization = toBasicAuth(apiKey);
  return new HttpMarketDataProvider({
    providerId: 'databento-historical',
    capabilities: {
      prices: true,
      corporateActions: false,
      pointInTime: true,
      revisions: true,
      delistedEntities: true,
    },
    fetchImpl,
    timeoutMs,
    metadata: {
      provider: 'Databento',
      provenance: 'Databento Historical API timeseries.get_range',
      licence: 'Contractual Databento data licence; entitlements must be verified for each dataset and use case.',
      licenceVerifiedAt: '2026-08-03',
      pointInTimeStatement: 'The adapter preserves event and receive timestamps and does not infer unavailable historical values.',
    },
    buildRequest(query) {
      const dataset = required(query.dataset, 'query.dataset');
      const symbol = required(query.symbol, 'query.symbol');
      const start = required(query.start, 'query.start');
      const end = required(query.end, 'query.end');
      const schema = query.schema ?? 'ohlcv-1d';
      if (!ALLOWED_SCHEMAS.has(schema)) throw new RangeError(`unsupported Databento schema: ${schema}`);
      const body = new URLSearchParams({
        dataset,
        symbols: symbol,
        schema,
        start,
        end,
        encoding: 'json',
        pretty_px: 'true',
        pretty_ts: 'true',
        map_symbols: 'true',
      });
      return {
        url: ENDPOINT,
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      };
    },
    mapResponse(payload, query) {
      const rows = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(rows)) throw new TypeError('Databento response must contain an array of records');
      return rows.map((row) => mapRow(row, query));
    },
  });
}

export const DATABENTO_PROFILE = Object.freeze({
  endpoint: ENDPOINT,
  authentication: 'http-basic-api-key-as-username',
  supportedSchemas: Object.freeze([...ALLOWED_SCHEMAS]),
  requiresApiKey: true,
  externallyValidated: false,
  productionReady: false,
});
