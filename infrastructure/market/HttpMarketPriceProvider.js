import { Money } from '../../domain/money/Money.js';
import { MarketQuote } from '../../domain/market-data/MarketQuote.js';

export class MarketDataProviderError extends Error {
  constructor(message, { code = 'MARKET_DATA_ERROR', statusCode = null, cause = null } = {}) {
    super(message, cause == null ? undefined : { cause });
    this.name = 'MarketDataProviderError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class HttpMarketPriceProvider {
  constructor({ endpointBuilder, responseMapper, fetchImplementation = globalThis.fetch, headers = {}, timeoutMilliseconds = 5_000, cacheTtlMilliseconds = 30_000, clock = () => new Date() }) {
    if (typeof endpointBuilder !== 'function') throw new TypeError('endpointBuilder doit être une fonction.');
    if (typeof responseMapper !== 'function') throw new TypeError('responseMapper doit être une fonction.');
    if (typeof fetchImplementation !== 'function') throw new TypeError('fetchImplementation doit être une fonction.');
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) throw new TypeError('headers doit être un objet.');
    positiveInteger(timeoutMilliseconds, 'timeoutMilliseconds');
    nonNegativeInteger(cacheTtlMilliseconds, 'cacheTtlMilliseconds');
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');

    this.endpointBuilder = endpointBuilder;
    this.responseMapper = responseMapper;
    this.fetchImplementation = fetchImplementation;
    this.headers = Object.freeze({ ...headers });
    this.timeoutMilliseconds = timeoutMilliseconds;
    this.cacheTtlMilliseconds = cacheTtlMilliseconds;
    this.clock = clock;
    this.cache = new Map();
    this.inFlight = new Map();
  }

  async getPrice(assetId) {
    return (await this.getQuote(assetId)).price;
  }

  async getQuote(assetId) {
    const normalizedAssetId = text(assetId, 'assetId');
    const now = instant(this.clock(), 'clock');
    const cached = this.cache.get(normalizedAssetId);
    if (cached && Date.parse(now) - cached.cachedAt <= this.cacheTtlMilliseconds) return cached.quote;
    if (this.inFlight.has(normalizedAssetId)) return this.inFlight.get(normalizedAssetId);

    const request = this.#fetchQuote(normalizedAssetId, now).finally(() => this.inFlight.delete(normalizedAssetId));
    this.inFlight.set(normalizedAssetId, request);
    return request;
  }

  clearCache(assetId = null) {
    if (assetId == null) return this.cache.clear();
    this.cache.delete(text(assetId, 'assetId'));
  }

  async #fetchQuote(assetId, requestedAt) {
    let endpoint;
    try {
      endpoint = new URL(this.endpointBuilder(assetId)).toString();
    } catch (cause) {
      throw new MarketDataProviderError(`Endpoint invalide pour ${assetId}.`, { code: 'INVALID_ENDPOINT', cause });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMilliseconds);
    try {
      const response = await this.fetchImplementation(endpoint, { method: 'GET', headers: this.headers, signal: controller.signal });
      if (!response || typeof response.ok !== 'boolean' || typeof response.json !== 'function') {
        throw new MarketDataProviderError('La réponse HTTP du fournisseur est invalide.', { code: 'INVALID_RESPONSE' });
      }
      if (!response.ok) {
        throw new MarketDataProviderError(`Le fournisseur de marché a répondu avec le statut ${response.status}.`, {
          code: response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_HTTP_ERROR', statusCode: response.status
        });
      }

      const mapped = await this.responseMapper(await response.json(), { assetId, requestedAt, endpoint });
      if (!mapped || typeof mapped !== 'object') throw new MarketDataProviderError('responseMapper doit retourner un objet.', { code: 'INVALID_MAPPING' });

      const quote = new MarketQuote({
        assetId,
        price: new Money(positiveNumber(mapped.price, 'price'), currency(mapped.currency)),
        quotedAt: instant(mapped.quotedAt ?? requestedAt, 'quotedAt'),
        source: text(mapped.source ?? new URL(endpoint).hostname, 'source')
      });
      this.cache.set(assetId, { quote, cachedAt: Date.parse(requestedAt) });
      return quote;
    } catch (cause) {
      if (cause instanceof MarketDataProviderError) throw cause;
      if (cause?.name === 'AbortError') throw new MarketDataProviderError(`Délai dépassé pour la cotation ${assetId}.`, { code: 'TIMEOUT', cause });
      throw new MarketDataProviderError(`Impossible de récupérer la cotation ${assetId}.`, { code: 'NETWORK_ERROR', cause });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
function currency(value) { const result = text(value, 'currency').toUpperCase(); if (!/^[A-Z]{3}$/.test(result)) throw new TypeError('currency doit être une devise ISO à trois lettres.'); return result; }
function positiveNumber(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${field} doit être strictement positif.`); return number; }
function positiveInteger(value, field) { if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${field} doit être un entier strictement positif.`); }
function nonNegativeInteger(value, field) { if (!Number.isInteger(value) || value < 0) throw new RangeError(`${field} doit être un entier positif ou nul.`); }
function instant(value, field) { const timestamp = value instanceof Date ? value.getTime() : Date.parse(value); if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date valide.`); return new Date(timestamp).toISOString(); }
