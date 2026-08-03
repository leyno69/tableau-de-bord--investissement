import test from 'node:test';
import assert from 'node:assert/strict';
import { TwelveDataProvider } from './TwelveDataProvider.js';

const payload = {
  meta: { symbol: 'AAPL', interval: '1day' },
  values: [{ datetime: '2026-07-31', open: '200', high: '205', low: '198', close: '203', volume: '1000' }],
  status: 'ok',
};

test('utilise la clé dans le header et normalise les prix', async () => {
  let request;
  const provider = new TwelveDataProvider({
    apiKey: 'secret-test-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => payload };
    },
  });
  const result = await provider.fetchPrices({ symbol: 'AAPL', interval: '1day', outputsize: 10 });
  assert.match(request.url, /time_series/);
  assert.match(request.url, /symbol=AAPL/);
  assert.equal(request.options.headers.Authorization, 'apikey secret-test-key');
  assert.equal(request.url.includes('secret-test-key'), false);
  assert.equal(result.recordCount, 1);
  assert.equal(result.prices[0].close, 203);
  assert.equal(result.externallyValidated, false);
});

test('refuse une clé absente', () => {
  assert.throws(() => new TwelveDataProvider({ apiKey: '' }), /TWELVEDATA_API_KEY/);
});

test('refuse un intervalle non documenté', async () => {
  const provider = new TwelveDataProvider({ apiKey: 'x', fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(() => provider.fetchPrices({ symbol: 'AAPL', interval: '3min' }), /unsupported interval/);
});

test('propage les erreurs structurées Twelve Data', async () => {
  const provider = new TwelveDataProvider({
    apiKey: 'x',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: 'error', code: 429, message: 'credits exhausted' }) }),
  });
  await assert.rejects(() => provider.fetchPrices({ symbol: 'AAPL', interval: '1day' }), /429.*credits exhausted/);
});

test('déclare des capacités conservatrices', async () => {
  const provider = new TwelveDataProvider({ apiKey: 'x', fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }) });
  assert.equal(provider.capabilities.prices, true);
  assert.equal(provider.capabilities.pointInTime, false);
  assert.equal(provider.capabilities.revisions, false);
  assert.equal(provider.capabilities.delistedEntities, false);
  const metadata = await provider.fetchMetadata();
  assert.match(metadata.pointInTimeStatement, /not asserted/);
});
