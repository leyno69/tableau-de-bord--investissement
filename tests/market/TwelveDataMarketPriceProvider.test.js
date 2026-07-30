import test from 'node:test';
import assert from 'node:assert/strict';

import { Instrument } from '../../domain/instrument/Instrument.js';
import { InstrumentResolutionError } from '../../application/services/InstrumentResolver.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { MarketDataProviderError } from '../../infrastructure/market/HttpMarketPriceProvider.js';
import { TwelveDataMarketPriceProvider } from '../../infrastructure/market/TwelveDataMarketPriceProvider.js';
import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';
import { createBootstrapProviders } from '../../runtime/providers/createBootstrapProviders.js';

test('convertit une réponse Twelve Data en prix de domaine', async () => {
  const provider = new TwelveDataMarketPriceProvider({
    apiKey: 'secret',
    fetchImplementation: async url => {
      assert.equal(new URL(url).searchParams.get('symbol'), 'AAPL');
      return {
        ok: true,
        status: 200,
        json: async () => ({ close: '229.15', currency: 'USD', timestamp: 1785456000, exchange: 'NASDAQ' })
      };
    }
  });

  const quote = await provider.getQuote('AAPL');
  assert.equal(quote.assetId, 'AAPL');
  assert.equal(quote.price.amount, 229.15);
  assert.equal(quote.price.currency, 'USD');
  assert.match(quote.source, /^TWELVE_DATA:/);
});

test('traduit les erreurs fonctionnelles et les limites de taux', async () => {
  const provider = new TwelveDataMarketPriceProvider({
    apiKey: 'secret',
    fetchImplementation: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'error', code: 429, message: 'Rate limit exceeded' })
    })
  });

  await assert.rejects(
    () => provider.getPrice('AAPL'),
    error => error instanceof MarketDataProviderError && error.code === 'RATE_LIMITED'
  );
});

test('active Twelve Data depuis les variables d’environnement', async () => {
  const config = loadServerConfig({
    MARKET_PROVIDER: 'twelve-data',
    TWELVE_DATA_API_KEY: 'secret',
    MARKET_TIMEOUT_MS: '2500',
    MARKET_CACHE_TTL_MS: '60000'
  });
  const instrumentRepository = new InMemoryInstrumentRepository([
    new Instrument({
      id: 'AIR',
      type: Instrument.TYPES.STOCK,
      name: 'Airbus',
      ticker: 'AIR',
      venue: 'XPAR',
      currency: 'EUR',
      providerMappings: [{ provider: 'twelve-data', symbol: 'AIR' }]
    })
  ]);
  const providers = createBootstrapProviders({
    market: config.market,
    instrumentRepository,
    fetchImplementation: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ close: '10', currency: 'EUR' })
    })
  });

  assert.equal((await providers.marketPriceProvider.getPrice('AIR')).amount, 10);
  await assert.rejects(
    () => providers.marketPriceProvider.getPrice('UNKNOWN'),
    error => error instanceof InstrumentResolutionError && error.code === 'INSTRUMENT_NOT_FOUND'
  );
  assert.throws(
    () => createBootstrapProviders({ market: { provider: 'twelve-data', apiKey: '' } }),
    /TWELVE_DATA_API_KEY/
  );
});
