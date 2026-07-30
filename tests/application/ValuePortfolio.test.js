import test from 'node:test';
import assert from 'node:assert/strict';

import { ValuePortfolio } from '../../application/use-cases/ValuePortfolio.js';
import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';

function createUseCase({ prices = {}, rates = {} } = {}) {
  return new ValuePortfolio({
    marketPriceProvider: {
      async getPrice(assetId) {
        return prices[assetId];
      }
    },
    exchangeRateProvider: {
      async getRate(fromCurrency, toCurrency) {
        return rates[`${fromCurrency}/${toCurrency}`];
      }
    }
  });
}

test('valorise positions et espèces dans la devise de référence', async () => {
  const useCase = createUseCase({
    prices: {
      WORLD: new Money(100, 'EUR'),
      US_STOCK: new Money(50, 'USD')
    },
    rates: {
      'USD/EUR': 0.9
    }
  });
  const positions = [
    new Position({ assetId: 'WORLD', quantity: 2, currency: 'EUR' }),
    new Position({ assetId: 'US_STOCK', quantity: 4, currency: 'USD' })
  ];

  const result = await useCase.execute({
    positions,
    cashBalances: [
      { portfolioId: 'portfolio-1', accountId: 'cash-eur', balance: new Money(100, 'EUR') },
      { portfolioId: 'portfolio-1', accountId: 'cash-usd', balance: new Money(100, 'USD') }
    ],
    baseCurrency: 'eur'
  });

  assert.deepEqual(result.positionsValue.toJSON(), { amount: 380, currency: 'EUR' });
  assert.deepEqual(result.cashValue.toJSON(), { amount: 190, currency: 'EUR' });
  assert.deepEqual(result.totalValue.toJSON(), { amount: 570, currency: 'EUR' });
  assert.equal(result.positions[1].nativeValue.amount, 200);
  assert.equal(result.positions[1].convertedValue.amount, 180);
  assert.equal(result.positions[1].position, positions[1]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.positions), true);
});

test('n’interroge pas le fournisseur de change pour une devise identique', async () => {
  let exchangeCalls = 0;
  const useCase = new ValuePortfolio({
    marketPriceProvider: {
      async getPrice() {
        return new Money(10, 'EUR');
      }
    },
    exchangeRateProvider: {
      async getRate() {
        exchangeCalls += 1;
        return 1;
      }
    }
  });

  await useCase.execute({
    positions: [new Position({ assetId: 'A', quantity: 2, currency: 'EUR' })],
    cashBalances: [{ accountId: 'cash', balance: new Money(5, 'EUR') }],
    baseCurrency: 'EUR'
  });

  assert.equal(exchangeCalls, 0);
});

test('ignore les positions fermées', async () => {
  let priceCalls = 0;
  const useCase = new ValuePortfolio({
    marketPriceProvider: {
      async getPrice() {
        priceCalls += 1;
        return new Money(10, 'EUR');
      }
    },
    exchangeRateProvider: { async getRate() { return 1; } }
  });

  const result = await useCase.execute({
    positions: [new Position({ assetId: 'CLOSED', quantity: 0 })],
    cashBalances: [],
    baseCurrency: 'EUR'
  });

  assert.equal(priceCalls, 0);
  assert.equal(result.totalValue.amount, 0);
});

test('refuse les réponses invalides des fournisseurs', async () => {
  await assert.rejects(
    () => createUseCase({ prices: { A: 10 } }).execute({
      positions: [new Position({ assetId: 'A', quantity: 1 })],
      cashBalances: [],
      baseCurrency: 'EUR'
    }),
    /instance de Money/
  );

  await assert.rejects(
    () => createUseCase({
      prices: { A: new Money(10, 'USD') },
      rates: { 'USD/EUR': 0 }
    }).execute({
      positions: [new Position({ assetId: 'A', quantity: 1, currency: 'USD' })],
      cashBalances: [],
      baseCurrency: 'EUR'
    }),
    /strictement positif/
  );
});

test('valide les contrats et les entrées', async () => {
  assert.throws(
    () => new ValuePortfolio({ marketPriceProvider: {}, exchangeRateProvider: {} }),
    /getPrice/
  );

  const useCase = createUseCase();

  await assert.rejects(
    () => useCase.execute({ positions: {}, cashBalances: [], baseCurrency: 'EUR' }),
    /positions doit être un tableau/
  );

  await assert.rejects(
    () => useCase.execute({ positions: [{}], cashBalances: [], baseCurrency: 'EUR' }),
    /instance de Position/
  );

  await assert.rejects(
    () => useCase.execute({ positions: [], cashBalances: [{ balance: 10 }], baseCurrency: 'EUR' }),
    /instance de Money/
  );
});
