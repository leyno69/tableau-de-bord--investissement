import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpMarketDataProvider } from './HttpMarketDataProvider.js';

function createProvider(overrides = {}) {
  return new HttpMarketDataProvider({
    providerId: 'licensed-http-test',
    capabilities: {
      prices: true,
      corporateActions: false,
      pointInTime: true,
      revisions: true,
      delistedEntities: false,
    },
    fetchImpl: async (url, options) => ({
      ok: true,
      status: 200,
      async json() {
        return { url, headers: options.headers, rows: [{ t: '2020-01-02', o: 10, h: 12, l: 9, c: 11, v: 100 }] };
      },
    }),
    buildRequest: ({ symbol }) => ({
      url: `https://example.test/prices/${symbol}`,
      headers: { Authorization: 'Bearer secret-not-stored' },
    }),
    mapResponse: (payload, query) => payload.rows.map((row) => ({
      symbol: query.symbol,
      observedAt: row.t,
      availableAt: row.t,
      open: row.o,
      high: row.h,
      low: row.l,
      close: row.c,
      volume: row.v,
      sourceRevision: 'first-release',
    })),
    metadata: {
      provider: 'Licensed test provider',
      provenance: 'Synthetic transport fixture only',
      licence: 'Test fixture licence',
      licenceVerifiedAt: '2026-08-03',
      pointInTimeStatement: 'The adapter requires availableAt on every mapped record.',
    },
    ...overrides,
  });
}

test('maps an authenticated HTTP response into immutable normalized prices', async () => {
  const provider = createProvider();
  const result = await provider.fetchPrices({ symbol: 'ABC' });
  assert.equal(result.recordCount, 1);
  assert.equal(result.prices[0].symbol, 'ABC');
  assert.equal(result.prices[0].close, 11);
  assert.equal(result.externallyValidated, false);
  assert.equal(result.productionReady, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.prices[0]), true);
});

test('returns immutable licence and provenance metadata', async () => {
  const metadata = await createProvider().fetchMetadata();
  assert.equal(metadata.provider, 'Licensed test provider');
  assert.equal(Object.isFrozen(metadata), true);
});

test('fails closed on an HTTP error', async () => {
  const provider = createProvider({
    fetchImpl: async () => ({ ok: false, status: 429, async json() { return {}; } }),
  });
  await assert.rejects(() => provider.fetchPrices({ symbol: 'ABC' }), /HTTP 429/);
});

test('rejects inconsistent OHLC records', async () => {
  const provider = createProvider({
    mapResponse: () => [{
      symbol: 'ABC', observedAt: '2020-01-02', availableAt: '2020-01-02',
      open: 10, high: 9, low: 8, close: 11, volume: 1,
    }],
  });
  await assert.rejects(() => provider.fetchPrices({ symbol: 'ABC' }), /OHLC consistency/);
});

test('requires explicit point-in-time metadata', () => {
  assert.throws(() => createProvider({
    metadata: {
      provider: 'X', provenance: 'Y', licence: 'Z', licenceVerifiedAt: '2026-08-03', pointInTimeStatement: '',
    },
  }), /pointInTimeStatement/);
});

test('does not pretend to implement corporate actions generically', async () => {
  const provider = createProvider();
  await assert.rejects(() => provider.fetchCorporateActions(), /not supported/);
});
