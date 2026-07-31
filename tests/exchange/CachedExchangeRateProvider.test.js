import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { JsonFileExchangeRateCache } from '../../infrastructure/exchange/JsonFileExchangeRateCache.js';
import { CachedExchangeRateProvider } from '../../infrastructure/exchange/CachedExchangeRateProvider.js';

test('persiste puis recharge un taux de change', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'exchange-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'rates.json');
  const cache = await JsonFileExchangeRateCache.open({ filePath: path });
  await cache.save({ from: 'usd', to: 'eur', rate: 0.92, fetchedAt: '2026-07-31T05:00:00.000Z' });
  const reopened = await JsonFileExchangeRateCache.open({ filePath: path });
  assert.deepEqual(await reopened.get('USD', 'EUR'), { from: 'USD', to: 'EUR', rate: 0.92, fetchedAt: '2026-07-31T05:00:00.000Z' });
});

test('retourne le taux frais du fournisseur et le met en cache', async () => {
  const entries = new Map();
  const cache = { async get(a, b) { return entries.get(`${a}/${b}`) ?? null; }, async save(entry) { entries.set(`${entry.from}/${entry.to}`, entry); } };
  const provider = new CachedExchangeRateProvider({
    provider: { async getRate() { return 0.91; } }, cache,
    clock: () => new Date('2026-07-31T05:00:00.000Z')
  });
  assert.equal(await provider.getRate('USD', 'EUR'), 0.91);
  assert.equal((await provider.getRateDetails('USD', 'EUR')).status, 'fresh');
});

test('réutilise un taux périmé en cas de panne', async () => {
  const error = Object.assign(new Error('indisponible'), { code: 'FX_DOWN' });
  const provider = new CachedExchangeRateProvider({
    provider: { async getRate() { throw error; } },
    cache: {
      async get() { return { from: 'USD', to: 'EUR', rate: 0.9, fetchedAt: '2026-07-31T03:00:00.000Z' }; },
      async save() {}
    },
    clock: () => new Date('2026-07-31T05:00:00.000Z'), staleAfterMs: 60 * 60 * 1000
  });
  const result = await provider.getRateDetails('USD', 'EUR');
  assert.equal(result.rate, 0.9);
  assert.equal(result.status, 'stale');
  assert.equal(result.ageMs, 2 * 60 * 60 * 1000);
  assert.equal(result.failureCode, 'FX_DOWN');
});

test('propage la panne lorsqu’aucun taux n’est disponible', async () => {
  const provider = new CachedExchangeRateProvider({
    provider: { async getRate() { throw new Error('indisponible'); } },
    cache: { async get() { return null; }, async save() {} }
  });
  await assert.rejects(() => provider.getRate('CHF', 'EUR'), /indisponible/);
});
