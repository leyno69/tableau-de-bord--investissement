import { HttpMarketPriceProvider, MarketDataProviderError } from './HttpMarketPriceProvider.js';

const DEFAULT_BASE_URL = 'https://api.twelvedata.com';

/**
 * Adaptateur concret pour l’endpoint /quote de Twelve Data.
 *
 * Le domaine continue de consommer getPrice(assetId). Le symbole externe peut
 * être différent de l’assetId grâce au symbolResolver injecté.
 */
export class TwelveDataMarketPriceProvider extends HttpMarketPriceProvider {
  constructor({
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    symbolResolver = assetId => assetId,
    fetchImplementation = globalThis.fetch,
    timeoutMilliseconds = 5_000,
    cacheTtlMilliseconds = 30_000,
    clock = () => new Date()
  } = {}) {
    const normalizedApiKey = requiredText(apiKey, 'apiKey');
    const normalizedBaseUrl = validBaseUrl(baseUrl);
    if (typeof symbolResolver !== 'function') {
      throw new TypeError('symbolResolver doit être une fonction.');
    }

    super({
      fetchImplementation,
      timeoutMilliseconds,
      cacheTtlMilliseconds,
      clock,
      endpointBuilder(assetId) {
        const symbol = requiredText(symbolResolver(assetId), 'symbol');
        const endpoint = new URL('/quote', normalizedBaseUrl);
        endpoint.searchParams.set('symbol', symbol);
        endpoint.searchParams.set('apikey', normalizedApiKey);
        return endpoint.toString();
      },
      responseMapper(payload, { assetId }) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new MarketDataProviderError('Réponse Twelve Data invalide.', { code: 'INVALID_MAPPING' });
        }
        if (payload.status === 'error' || payload.code != null) {
          const code = Number(payload.code);
          throw new MarketDataProviderError(
            requiredText(payload.message ?? 'Erreur Twelve Data.', 'message'),
            {
              code: code === 429 ? 'RATE_LIMITED' : 'UPSTREAM_API_ERROR',
              statusCode: Number.isInteger(code) ? code : null
            }
          );
        }

        const timestamp = Number(payload.timestamp ?? payload.last_quote_at);
        return {
          price: payload.close,
          currency: payload.currency,
          quotedAt: Number.isFinite(timestamp)
            ? new Date(timestamp * 1000).toISOString()
            : undefined,
          source: `TWELVE_DATA:${payload.exchange ?? payload.mic_code ?? assetId}`
        };
      }
    });
  }
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function validBaseUrl(value) {
  const url = new URL(requiredText(value, 'baseUrl'));
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError('baseUrl doit utiliser HTTP ou HTTPS.');
  }
  return url.toString();
}
