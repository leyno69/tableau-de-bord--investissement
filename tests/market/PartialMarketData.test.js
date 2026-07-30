import test from 'node:test';
import assert from 'node:assert/strict';

import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';
import { LoadPortfolioMarketQuotes } from '../../application/use-cases/LoadPortfolioMarketQuotes.js';
import { ValuePortfolio } from '../../application/use-cases/ValuePortfolio.js';

const positions = [
  new Position({ assetId: 'asset-a', quantity: 2, currency: 'EUR' }),
  new Position({ assetId: 'asset-b', quantity: 3, currency: 'EUR' })
];

test('collecte les cotations disponibles et décrit les échecs en mode partiel', async () => {
  const loader = new LoadPortfolioMarketQuotes({
    marketDataProvider: {
      async getQuote(assetId) {
        if (assetId === 'asset-b') throw Object.assign(new Error('Limite atteinte.'), { code: 'RATE_LIMITED' });
        return Object.freeze({ assetId });
      }
    }
  });

  const result = await loader.executeDetailed({ positions, policy: 'partial' });
  assert.equal(result.complete, false);
  assert.equal(result.loaded, 1);
  assert.deepEqual(result.quotes.map(quote => quote.assetId), ['asset-a']);
  assert.deepEqual(result.issues, [{ assetId: 'asset-b', stage: 'QUOTE', code: 'RATE_LIMITED', message: 'Limite atteinte.' }]);
});

test('le mode strict propage la première erreur de cotation', async () => {
  const loader = new LoadPortfolioMarketQuotes({
    marketDataProvider: { async getQuote() { throw new Error('indisponible'); } }
  });
  await assert.rejects(() => loader.execute({ positions, policy: 'strict' }), /indisponible/);
});

test('valorise les positions disponibles et marque le total comme partiel', async () => {
  const useCase = new ValuePortfolio({
    marketPriceProvider: {
      async getPrice(assetId) {
        if (assetId === 'asset-b') throw Object.assign(new Error('Symbole absent.'), { code: 'PROVIDER_SYMBOL_NOT_FOUND' });
        return new Money(10, 'EUR');
      }
    },
    exchangeRateProvider: { async getRate() { return 1; } }
  });

  const valuation = await useCase.execute({ positions, cashBalances: [], baseCurrency: 'EUR', marketDataPolicy: 'partial' });
  assert.equal(valuation.totalValue.amount, 20);
  assert.equal(valuation.complete, false);
  assert.equal(valuation.valuedPositionCount, 1);
  assert.equal(valuation.requestedPositionCount, 2);
  assert.deepEqual(valuation.issues, [{ assetId: 'asset-b', stage: 'VALUATION', code: 'PROVIDER_SYMBOL_NOT_FOUND', message: 'Symbole absent.' }]);
});

test('la valorisation reste stricte par défaut', async () => {
  const useCase = new ValuePortfolio({
    marketPriceProvider: { async getPrice() { throw new Error('prix absent'); } },
    exchangeRateProvider: { async getRate() { return 1; } }
  });
  await assert.rejects(() => useCase.execute({ positions, cashBalances: [], baseCurrency: 'EUR' }), /prix absent/);
});
