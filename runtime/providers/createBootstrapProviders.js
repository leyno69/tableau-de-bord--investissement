import { InstrumentResolver } from '../../application/services/InstrumentResolver.js';
import { ResolvingMarketPriceProvider } from '../../infrastructure/market/ResolvingMarketPriceProvider.js';
import { TwelveDataMarketPriceProvider } from '../../infrastructure/market/TwelveDataMarketPriceProvider.js';

export function createBootstrapProviders({ market = {}, instrumentRepository = null, fetchImplementation = globalThis.fetch } = {}) {
  const marketPriceProvider = createMarketPriceProvider({ market, instrumentRepository, fetchImplementation });

  return Object.freeze({
    marketPriceProvider,
    exchangeRateProvider: Object.freeze({
      async getRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        throw new Error(`Aucun fournisseur de change n'est configuré pour ${fromCurrency}/${toCurrency}.`);
      }
    }),
    assetClassificationProvider: Object.freeze({
      async getClassification() {
        return Object.freeze({ assetClass: 'UNKNOWN', region: 'UNKNOWN', sector: 'UNKNOWN' });
      }
    })
  });
}

function createMarketPriceProvider({ market, instrumentRepository, fetchImplementation }) {
  const provider = market.provider ?? 'bootstrap';
  if (provider === 'twelve-data') {
    if (typeof market.apiKey !== 'string' || market.apiKey.trim() === '') {
      throw new Error('TWELVE_DATA_API_KEY est obligatoire lorsque MARKET_PROVIDER=twelve-data.');
    }
    requireInstrumentRepository(instrumentRepository);
    const upstreamProvider = new TwelveDataMarketPriceProvider({
      apiKey: market.apiKey,
      baseUrl: market.baseUrl,
      timeoutMilliseconds: market.timeoutMilliseconds,
      cacheTtlMilliseconds: market.cacheTtlMilliseconds,
      fetchImplementation
    });
    const instrumentResolver = new InstrumentResolver({
      instrumentRepository,
      provider: 'twelve-data'
    });
    return new ResolvingMarketPriceProvider({ instrumentResolver, marketPriceProvider: upstreamProvider });
  }

  return Object.freeze({
    async getPrice(assetId) {
      throw new Error(`Aucun fournisseur de prix n'est configuré pour l'actif "${assetId}".`);
    }
  });
}

function requireInstrumentRepository(repository) {
  if (!repository || typeof repository.findByAnyIdentifier !== 'function') {
    throw new TypeError('instrumentRepository doit implémenter findByAnyIdentifier() lorsque MARKET_PROVIDER=twelve-data.');
  }
}
