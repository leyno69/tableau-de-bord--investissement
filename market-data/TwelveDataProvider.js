import { HttpMarketDataProvider } from './HttpMarketDataProvider.js';

const INTERVALS = new Set(['1min','5min','15min','30min','45min','1h','2h','4h','8h','1day','1week','1month']);

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function mapValues(payload, query) {
  if (payload?.status === 'error') throw new Error(`Twelve Data error ${payload.code ?? 'unknown'}: ${payload.message ?? 'unknown error'}`);
  if (!Array.isArray(payload?.values)) throw new TypeError('Twelve Data response must contain values');
  return payload.values.map((row) => ({
    symbol: payload.meta?.symbol ?? query.symbol,
    observedAt: row.datetime,
    availableAt: row.datetime,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume ?? null,
    sourceRevision: null,
  }));
}

export class TwelveDataProvider extends HttpMarketDataProvider {
  constructor({ apiKey = process.env.TWELVEDATA_API_KEY, fetchImpl = globalThis.fetch, timeoutMs } = {}) {
    const key = required(apiKey, 'TWELVEDATA_API_KEY');
    super({
      providerId: 'twelve-data',
      capabilities: {
        prices: true,
        corporateActions: false,
        pointInTime: false,
        revisions: false,
        delistedEntities: false,
      },
      fetchImpl,
      timeoutMs,
      metadata: {
        provider: 'Twelve Data',
        provenance: 'Twelve Data REST API /time_series',
        licence: 'Twelve Data account terms; rights must be verified for the active plan and intended use',
        licenceVerifiedAt: '2026-08-03',
        pointInTimeStatement: 'Bar timestamps are returned, but historical publication/revision lineage is not asserted by this adapter.',
      },
      buildRequest(query) {
        const symbol = required(query.symbol, 'query.symbol');
        const interval = required(query.interval ?? '1day', 'query.interval');
        if (!INTERVALS.has(interval)) throw new RangeError(`unsupported interval: ${interval}`);
        const params = new URLSearchParams({ symbol, interval, outputsize: String(query.outputsize ?? 5000) });
        if (query.startDate) params.set('start_date', required(query.startDate, 'query.startDate'));
        if (query.endDate) params.set('end_date', required(query.endDate, 'query.endDate'));
        if (query.timezone) params.set('timezone', required(query.timezone, 'query.timezone'));
        return {
          url: `https://api.twelvedata.com/time_series?${params}`,
          headers: { Authorization: `apikey ${key}` },
        };
      },
      mapResponse: mapValues,
    });
  }
}

export const TWELVE_DATA_INTERVALS = Object.freeze([...INTERVALS]);
