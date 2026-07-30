import test from 'node:test';
import assert from 'node:assert/strict';

import { GetFreshMarketQuote } from '../../application/use-cases/GetFreshMarketQuote.js';
import { MarketQuote } from '../../domain/market-data/MarketQuote.js';
import { Money } from '../../domain/money/Money.js';
import { InMemoryMarketDataProvider } from '../../infrastructure/market-data/InMemoryMarketDataProvider.js';

const quote = (assetId, amount, quotedAt, currency = 'EUR') => new MarketQuote({
  assetId,
  price: new Money(amount, currency),
  quotedAt,
  source: 'TEST'
});

test('crée une cotation immuable et calcule son âge', () => {
  const marketQuote = quote('WORLD', 100, '2026-07-30T10:00:00.000Z');
  assert.equal(marketQuote.ageInMilliseconds('2026-07-30T10:01:00.000Z'), 60000);
  assert.equal(marketQuote.isFresh({
    referenceTime: '2026-07-30T10:01:00.000Z',
    maxAgeMilliseconds: 60000
  }), true);
  assert.equal(Object.isFrozen(marketQuote), true);
});

test('retourne la dernière cotation et son prix pour compatibilité', async () => {
  const provider = new InMemoryMarketDataProvider([
    quote('WORLD', 90, '2026-07-29T10:00:00.000Z'),
    quote('WORLD', 100, '2026-07-30T10:00:00.000Z')
  ]);
  assert.equal((await provider.getQuote('WORLD')).price.amount, 100);
  assert.equal((await provider.getPrice('WORLD')).amount, 100);
});

test('filtre un historique par intervalle inclusif', async () => {
  const provider = new InMemoryMarketDataProvider([
    quote('A', 10, '2026-07-28T10:00:00.000Z'),
    quote('A', 11, '2026-07-29T10:00:00.000Z'),
    quote('A', 12, '2026-07-30T10:00:00.000Z')
  ]);
  const history = await provider.getHistory('A', {
    from: '2026-07-29T00:00:00.000Z',
    to: '2026-07-30T00:00:00.000Z'
  });
  assert.deepEqual(history.map(item => item.price.amount), [11]);
  assert.equal(Object.isFrozen(history), true);
});

test('accepte une cotation fraîche et expose son âge', async () => {
  const provider = new InMemoryMarketDataProvider([
    quote('WORLD', 100, '2026-07-30T09:59:30.000Z')
  ]);
  const useCase = new GetFreshMarketQuote({
    marketDataProvider: provider,
    clock: () => '2026-07-30T10:00:00.000Z'
  });
  const result = await useCase.execute({ assetId: 'WORLD', maxAgeMilliseconds: 60000 });
  assert.equal(result.fresh, true);
  assert.equal(result.ageMilliseconds, 30000);
});

test('refuse une cotation périmée sauf autorisation explicite', async () => {
  const provider = new InMemoryMarketDataProvider([
    quote('WORLD', 100, '2026-07-30T09:00:00.000Z')
  ]);
  const useCase = new GetFreshMarketQuote({
    marketDataProvider: provider,
    clock: () => '2026-07-30T10:00:00.000Z'
  });
  await assert.rejects(
    () => useCase.execute({ assetId: 'WORLD', maxAgeMilliseconds: 60000 }),
    /périmée/
  );
  const result = await useCase.execute({
    assetId: 'WORLD',
    maxAgeMilliseconds: 60000,
    allowStale: true
  });
  assert.equal(result.fresh, false);
});

test('refuse les cotations et intervalles invalides', async () => {
  assert.throws(
    () => new MarketQuote({ assetId: 'A', price: new Money(0, 'EUR'), quotedAt: 'x', source: 'T' }),
    /positive/
  );
  const provider = new InMemoryMarketDataProvider();
  await assert.rejects(() => provider.getQuote('UNKNOWN'), /Aucune cotation/);
  await assert.rejects(
    () => provider.getHistory('A', { from: '2026-07-31', to: '2026-07-30' }),
    /antérieur/
  );
});
