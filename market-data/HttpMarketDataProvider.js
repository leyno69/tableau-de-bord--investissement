import { MarketDataProvider } from './MarketDataProvider.js';

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeDate(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${name} must be an ISO-compatible date`);
  return normalized;
}

function normalizePrice(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`prices[${index}] must be an object`);
  const values = ['open', 'high', 'low', 'close'].map((field) => Number(row[field]));
  if (values.some((value) => !Number.isFinite(value))) throw new TypeError(`prices[${index}] contains invalid OHLC values`);
  const [open, high, low, close] = values;
  if (low > high || [open, close].some((value) => value < low || value > high)) {
    throw new RangeError(`prices[${index}] violates OHLC consistency`);
  }
  const volume = row.volume == null ? null : Number(row.volume);
  if (volume !== null && (!Number.isFinite(volume) || volume < 0)) throw new TypeError(`prices[${index}].volume must be non-negative`);
  return {
    symbol: assertNonEmptyString(row.symbol, `prices[${index}].symbol`),
    observedAt: normalizeDate(row.observedAt, `prices[${index}].observedAt`),
    availableAt: normalizeDate(row.availableAt, `prices[${index}].availableAt`),
    open,
    high,
    low,
    close,
    volume,
    sourceRevision: row.sourceRevision == null ? null : String(row.sourceRevision),
  };
}

export class HttpMarketDataProvider extends MarketDataProvider {
  #fetch;
  #buildRequest;
  #mapResponse;
  #metadata;
  #timeoutMs;

  constructor({ providerId, capabilities, fetchImpl = globalThis.fetch, buildRequest, mapResponse, metadata, timeoutMs = 15_000 }) {
    super({ providerId, capabilities });
    this.#fetch = assertFunction(fetchImpl, 'fetchImpl');
    this.#buildRequest = assertFunction(buildRequest, 'buildRequest');
    this.#mapResponse = assertFunction(mapResponse, 'mapResponse');
    if (!metadata || typeof metadata !== 'object') throw new TypeError('metadata must be an object');
    this.#metadata = deepFreeze({
      provider: assertNonEmptyString(metadata.provider, 'metadata.provider'),
      provenance: assertNonEmptyString(metadata.provenance, 'metadata.provenance'),
      licence: assertNonEmptyString(metadata.licence, 'metadata.licence'),
      licenceVerifiedAt: normalizeDate(metadata.licenceVerifiedAt, 'metadata.licenceVerifiedAt'),
      pointInTimeStatement: assertNonEmptyString(metadata.pointInTimeStatement, 'metadata.pointInTimeStatement'),
    });
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer');
    this.#timeoutMs = timeoutMs;
    Object.freeze(this);
  }

  async fetchPrices(query) {
    if (!query || typeof query !== 'object') throw new TypeError('query must be an object');
    const request = await this.#buildRequest(deepFreeze({ ...query }));
    if (!request || typeof request !== 'object') throw new TypeError('buildRequest must return a request object');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response;
    try {
      response = await this.#fetch(assertNonEmptyString(request.url, 'request.url'), {
        method: request.method ?? 'GET',
        headers: { ...(request.headers ?? {}) },
        body: request.body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response || typeof response.ok !== 'boolean') throw new TypeError('fetchImpl returned an invalid response');
    if (!response.ok) throw new Error(`market data request failed with HTTP ${response.status}`);
    const payload = await response.json();
    const mapped = await this.#mapResponse(payload, deepFreeze({ ...query }));
    if (!Array.isArray(mapped)) throw new TypeError('mapResponse must return an array');
    const prices = mapped.map(normalizePrice).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    return deepFreeze({
      providerId: this.providerId,
      prices,
      recordCount: prices.length,
      externallyValidated: false,
      productionReady: false,
    });
  }

  async fetchCorporateActions() {
    if (!this.capabilities.corporateActions) throw new Error('corporate actions are not supported by this provider');
    throw new Error('corporate action mapping must be implemented by a dedicated provider adapter');
  }

  async fetchMetadata() {
    return this.#metadata;
  }
}
