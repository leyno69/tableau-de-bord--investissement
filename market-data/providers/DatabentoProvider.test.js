import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabentoProvider, DATABENTO_PROFILE } from './DatabentoProvider.js';

function response(payload, ok = true, status = 200) {
  return { ok, status, async json() { return payload; } };
}

test('builds an authenticated Databento request and maps OHLCV records', async () => {
  let request;
  const provider = createDatabentoProvider({
    apiKey: 'db-example-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response([{ symbol: 'AAPL', ts_event: '2024-01-02T00:00:00Z', ts_recv: '2024-01-02T00:00:01Z', open: '185', high: '188', low: '184', close: '187', volume: 1000 }]);
    },
  });
  const result = await provider.fetchPrices({ dataset: 'XNAS.ITCH', symbol: 'AAPL', schema: 'ohlcv-1d', start: '2024-01-01', end: '2024-02-01' });
  assert.equal(request.url, DATABENTO_PROFILE.endpoint);
  assert.equal(request.options.method, 'POST');
  assert.match(request.options.headers.Authorization, /^Basic /);
  assert.match(request.options.body, /dataset=XNAS\.ITCH/);
  assert.equal(result.recordCount, 1);
  assert.equal(result.prices[0].availableAt, '2024-01-02T00:00:01Z');
  assert.equal(result.externallyValidated, false);
});

test('requires an API key', () => {
  assert.throws(() => createDatabentoProvider(), /apiKey/);
});

test('rejects unsupported schemas before transport', async () => {
  const provider = createDatabentoProvider({ apiKey: 'db-example-key', fetchImpl: async () => response([]) });
  await assert.rejects(() => provider.fetchPrices({ dataset: 'XNAS.ITCH', symbol: 'AAPL', schema: 'mbo', start: '2024-01-01', end: '2024-02-01' }), /unsupported Databento schema/);
});

test('exposes conservative capabilities and metadata', async () => {
  const provider = createDatabentoProvider({ apiKey: 'db-example-key', fetchImpl: async () => response([]) });
  assert.equal(provider.capabilities.prices, true);
  assert.equal(provider.capabilities.corporateActions, false);
  assert.equal(provider.capabilities.pointInTime, true);
  const metadata = await provider.fetchMetadata();
  assert.equal(metadata.provider, 'Databento');
  assert.match(metadata.licence, /entitlements must be verified/);
});
