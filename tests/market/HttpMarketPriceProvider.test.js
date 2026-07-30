import test from 'node:test';
import assert from 'node:assert/strict';

import { Money } from '../../domain/money/Money.js';
import { MarketQuote } from '../../domain/market-data/MarketQuote.js';
import { HttpMarketPriceProvider, MarketDataProviderError } from '../../infrastructure/market/HttpMarketPriceProvider.js';

function createProvider(overrides = {}) {
  return new HttpMarketPriceProvider({
    endpointBuilder: assetId => `https://market.example/quotes/${encodeURIComponent(assetId)}`,
    responseMapper: payload => ({ price: payload.last, currency: payload.currency, quotedAt: payload.timestamp, source: 'TEST' }),
    fetchImplementation: async () => ({
      ok: true,
      status: 200,
      async json() { return { last: 123.45, currency: 'EUR', timestamp: '2026-07-30T20:00:00.000Z' }; }
    }),
    clock: () => new Date('2026-07-30T20:00:01.000Z'),
    ...overrides
  });
}

test('convertit une réponse HTTP en Money et MarketQuote', async () => {
  const provider = createProvider();
  const quote = await provider.getQuote('asset-1');
  const price = await provider.getPrice('asset-1');

  assert.ok(quote instanceof MarketQuote);
  assert.ok(price instanceof Money);
  assert.equal(price.amount, 123.45);
  assert.equal(price.currency, 'EUR');
  assert.equal(quote.source, 'TEST');
});

test('réutilise le cache et déduplique les requêtes simultanées', async () => {
  let calls = 0;
  let resolveFetch;
  const provider = createProvider({
    fetchImplementation: () => {
      calls += 1;
      return new Promise(resolve => { resolveFetch = () => resolve({ ok: true, status: 200, json: async () => ({ last: 10, currency: 'USD' }) }); });
    }
  });

  const first = provider.getQuote('asset-1');
  const second = provider.getQuote('asset-1');
  resolveFetch();
  assert.equal(await first, await second);
  await provider.getQuote('asset-1');
  assert.equal(calls, 1);
});

test('renouvelle une cotation expirée', async () => {
  let calls = 0;
  let now = '2026-07-30T20:00:00.000Z';
  const provider = createProvider({
    cacheTtlMilliseconds: 1000,
    clock: () => new Date(now),
    fetchImplementation: async () => ({ ok: true, status: 200, json: async () => ({ last: ++calls, currency: 'EUR' }) })
  });

  assert.equal((await provider.getPrice('asset-1')).amount, 1);
  now = '2026-07-30T20:00:02.000Z';
  assert.equal((await provider.getPrice('asset-1')).amount, 2);
});

test('traduit les statuts HTTP et erreurs réseau', async () => {
  const limited = createProvider({ fetchImplementation: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  await assert.rejects(() => limited.getPrice('asset-1'), error => error instanceof MarketDataProviderError && error.code === 'RATE_LIMITED');

  const offline = createProvider({ fetchImplementation: async () => { throw new Error('offline'); } });
  await assert.rejects(() => offline.getPrice('asset-1'), error => error instanceof MarketDataProviderError && error.code === 'NETWORK_ERROR');
});

test('valide les contrats de construction et le mapping', async () => {
  assert.throws(() => new HttpMarketPriceProvider({}), /endpointBuilder/);
  const invalid = createProvider({ responseMapper: () => ({ price: 0, currency: 'EUR' }) });
  await assert.rejects(() => invalid.getPrice('asset-1'), error => error instanceof MarketDataProviderError && error.code === 'INVALID_MAPPING');
});
