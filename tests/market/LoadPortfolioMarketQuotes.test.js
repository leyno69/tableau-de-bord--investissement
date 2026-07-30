import test from 'node:test';
import assert from 'node:assert/strict';

import { LoadPortfolioMarketQuotes } from '../../application/use-cases/LoadPortfolioMarketQuotes.js';
import { Position } from '../../domain/position/Position.js';


test('charge une cotation par actif détenu dans un ordre déterministe', async () => {
  const calls = [];
  const quotes = new Map([
    ['asset-a', Object.freeze({ assetId: 'asset-a' })],
    ['asset-b', Object.freeze({ assetId: 'asset-b' })]
  ]);
  const useCase = new LoadPortfolioMarketQuotes({
    marketDataProvider: {
      async getQuote(assetId) {
        calls.push(assetId);
        return quotes.get(assetId);
      }
    }
  });

  const result = await useCase.execute({
    positions: [
      new Position({ assetId: 'asset-b', quantity: 2 }),
      new Position({ assetId: 'asset-a', quantity: 1 }),
      new Position({ assetId: 'asset-b', quantity: 3 }),
      new Position({ assetId: 'asset-closed', quantity: 0 })
    ]
  });

  assert.deepEqual(calls, ['asset-a', 'asset-b']);
  assert.deepEqual(result.map(quote => quote.assetId), ['asset-a', 'asset-b']);
  assert.equal(Object.isFrozen(result), true);
});

test('refuse les positions qui ne respectent pas le contrat du domaine', async () => {
  const useCase = new LoadPortfolioMarketQuotes({
    marketDataProvider: { async getQuote() { return {}; } }
  });

  await assert.rejects(
    () => useCase.execute({ positions: [{ assetId: 'asset-a', quantity: 1 }] }),
    /instance de Position/
  );
});
