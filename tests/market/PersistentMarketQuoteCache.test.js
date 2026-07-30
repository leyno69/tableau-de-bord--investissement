import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { CachedMarketDataProvider } from '../../infrastructure/market/CachedMarketDataProvider.js';
import { JsonFileMarketQuoteCache } from '../../infrastructure/market/JsonFileMarketQuoteCache.js';

test('persiste une cotation fraîche et la recharge après redémarrage', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'market-quotes-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'quotes.json');
  const now = new Date('2026-07-31T00:00:00.000Z');

  const cache = await JsonFileMarketQuoteCache.open({ filePath });
  const provider = new CachedMarketDataProvider({
    provider: { async getQuote(assetId) { return { assetId, price: 123.45, currency: 'EUR' }; } },
    cache,
    clock: () => now
  });

  const quote = await provider.getQuote('asset-a');
  assert.equal(quote.marketData.status, 'fresh');
  assert.equal(quote.marketData.ageMs, 0);
  assert.equal(quote.marketData.fetchedAt, now.toISOString());

  const reloaded = await JsonFileMarketQuoteCache.open({ filePath });
  assert.deepEqual(await reloaded.get('asset-a'), {
    assetId: 'asset-a',
    quote: { assetId: 'asset-a', price: 123.45, currency: 'EUR' },
    fetchedAt: now.toISOString()
  });
  assert.equal(JSON.parse(await readFile(filePath, 'utf8')).version, 1);
});

test('réutilise une cotation périmée et expose explicitement son âge', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'market-quotes-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = await JsonFileMarketQuoteCache.open({ filePath: join(directory, 'quotes.json') });
  await cache.save({
    assetId: 'asset-a',
    quote: { assetId: 'asset-a', price: 100, currency: 'EUR' },
    fetchedAt: '2026-07-31T00:00:00.000Z'
  });

  const provider = new CachedMarketDataProvider({
    provider: { async getQuote() { throw Object.assign(new Error('panne'), { code: 'UPSTREAM_DOWN' }); } },
    cache,
    clock: () => new Date('2026-07-31T00:20:00.000Z'),
    staleAfterMs: 15 * 60 * 1000
  });

  const quote = await provider.getQuote('asset-a');
  assert.equal(quote.price, 100);
  assert.deepEqual(quote.marketData, {
    status: 'stale',
    fetchedAt: '2026-07-31T00:00:00.000Z',
    ageMs: 20 * 60 * 1000,
    staleAfterMs: 15 * 60 * 1000,
    fallback: true,
    failureCode: 'UPSTREAM_DOWN'
  });
});

test('propage la panne lorsque aucune cotation n’est disponible', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'market-quotes-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = await JsonFileMarketQuoteCache.open({ filePath: join(directory, 'quotes.json') });
  const failure = new Error('aucune donnée');
  const provider = new CachedMarketDataProvider({
    provider: { async getQuote() { throw failure; } },
    cache
  });

  await assert.rejects(() => provider.getQuote('asset-a'), error => error === failure);
});
