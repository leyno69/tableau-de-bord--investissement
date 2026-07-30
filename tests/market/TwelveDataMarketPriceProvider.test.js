import test from 'node:test';
import assert from 'node:assert/strict';

import { TwelveDataMarketPriceProvider } from '../../infrastructure/market/TwelveDataMarketPriceProvider.js';
import { MarketDataProviderError } from '../../infrastructure/market/HttpMarketPriceProvider.js';
import { createBootstrapProviders } from '../../runtime/providers/createBootstrapProviders.js';
import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';

test('mappe une cotation Twelve Data vers le domaine', async () => {
  let requestedUrl;
  const provider = new TwelveDataMarketPriceProvider({
    apiKey: 'secret',
    clock: () => new Date('2026-07-30T20:00:00.000Z'),
    fetchImplementation: async url => {
      requestedUrl = new URL(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          symbol: 'AAPL',
          exchange: 'NASDAQ',
          currency: 'USD',
          close: '201.25',
          timestamp: 1785441600
        })
      };
    }
  });

  const quote = await provider.getQuote('AAPL');
  assert.equal(requestedUrl.pathname, '/quote');
  assert.equal(requestedUrl.searchParams.get('symbol'), 'AAPL');
  assert.equal(requestedUrl.searchParams.get('apikey'), 'secret');
  assert.equal(quote.price.amount, 201.25);
  assert.equal(quote.price.currency, 'USD');
  assert.equal(quote.source, 'TWELVE_DATA:NASDAQ');
});

test('traduit les erreurs fonctionnelles de Twelve Data', async () => {
  const provider = new TwelveDataMarketPriceProvider({
    apiKey: 'secret',
    fetchImplementation: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'error', code: 429, message: 'API credits exhausted' })
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
  const providers = createBootstrapProviders({
    market: config.market,
    fetchImplementation: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ close: '10', currency: 'EUR' })
    })
  });

  assert.equal((await providers.marketPriceProvider.getPrice('AIR')).amount, 10);
  assert.throws(
    () => createBootstrapProviders({ market: { provider: 'twelve-data', apiKey: '' } }),
    /TWELVE_DATA_API_KEY/
  );
});
