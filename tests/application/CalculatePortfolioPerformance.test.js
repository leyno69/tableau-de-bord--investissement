import test from 'node:test';
import assert from 'node:assert/strict';

import { CalculatePortfolioPerformance } from '../../application/use-cases/CalculatePortfolioPerformance.js';
import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';

function createUseCase(rates = {}) {
  return new CalculatePortfolioPerformance({
    exchangeRateProvider: {
      async getRate(fromCurrency, toCurrency) {
        return rates[`${fromCurrency}/${toCurrency}`];
      }
    }
  });
}

function valuation({ positions, baseCurrency = 'EUR' }) {
  const positionsValue = positions.reduce(
    (total, line) => total.add(line.convertedValue),
    Money.zero(baseCurrency)
  );

  return Object.freeze({
    baseCurrency,
    positions: Object.freeze(positions),
    positionsValue
  });
}

test('calcule les gains latents, réalisés, dividendes et le rendement simple', async () => {
  const world = new Position({
    assetId: 'WORLD',
    quantity: 2,
    totalCost: 160,
    averageCost: 80,
    realizedPnL: 10,
    dividends: 5,
    currency: 'EUR'
  });
  const usStock = new Position({
    assetId: 'US',
    quantity: 4,
    totalCost: 120,
    averageCost: 30,
    realizedPnL: 20,
    dividends: 10,
    currency: 'USD'
  });

  const result = await createUseCase({ 'USD/EUR': 0.9 }).execute(valuation({
    positions: [
      Object.freeze({ position: world, convertedValue: new Money(200, 'EUR') }),
      Object.freeze({ position: usStock, convertedValue: new Money(180, 'EUR') })
    ]
  }));

  assert.deepEqual(result.investedCapital.toJSON(), { amount: 268, currency: 'EUR' });
  assert.deepEqual(result.marketValue.toJSON(), { amount: 380, currency: 'EUR' });
  assert.deepEqual(result.unrealizedGain.toJSON(), { amount: 112, currency: 'EUR' });
  assert.deepEqual(result.realizedGain.toJSON(), { amount: 28, currency: 'EUR' });
  assert.deepEqual(result.dividends.toJSON(), { amount: 14, currency: 'EUR' });
  assert.deepEqual(result.totalGain.toJSON(), { amount: 154, currency: 'EUR' });
  assert.equal(result.simpleReturnRate, 0.5746268657);
  assert.equal(result.lines[0].simpleReturnRate, 0.34375);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.lines), true);
});

test('retourne un taux nullement calculable lorsque le capital restant vaut zéro', async () => {
  const position = new Position({
    assetId: 'SOLD',
    quantity: 0,
    totalCost: 0,
    realizedPnL: 50,
    dividends: 0,
    currency: 'EUR'
  });

  const result = await createUseCase().execute(valuation({
    positions: [Object.freeze({
      position,
      convertedValue: Money.zero('EUR')
    })]
  }));

  assert.equal(result.simpleReturnRate, null);
  assert.deepEqual(result.totalGain.toJSON(), { amount: 50, currency: 'EUR' });
});

test('n’interroge pas le change lorsque les montants sont déjà en devise de référence', async () => {
  let calls = 0;
  const useCase = new CalculatePortfolioPerformance({
    exchangeRateProvider: {
      async getRate() {
        calls += 1;
        return 1;
      }
    }
  });
  const position = new Position({ assetId: 'A', quantity: 1, totalCost: 10 });

  await useCase.execute(valuation({
    positions: [Object.freeze({ position, convertedValue: new Money(12, 'EUR') })]
  }));

  assert.equal(calls, 0);
});

test('refuse les valorisations et lignes incomplètes', async () => {
  const useCase = createUseCase();

  await assert.rejects(() => useCase.execute(null), /valuation doit être un objet/);
  await assert.rejects(
    () => useCase.execute({ baseCurrency: 'EUR', positions: [], positionsValue: 0 }),
    /instance de Money/
  );
  await assert.rejects(
    () => useCase.execute(valuation({
      positions: [Object.freeze({
        position: {},
        convertedValue: new Money(1, 'EUR')
      })]
    })),
    /Position source/
  );
});

test('refuse un taux de change invalide', async () => {
  const position = new Position({
    assetId: 'USD',
    quantity: 1,
    totalCost: 10,
    currency: 'USD'
  });

  await assert.rejects(
    () => createUseCase({ 'USD/EUR': 0 }).execute(valuation({
      positions: [Object.freeze({
        position,
        convertedValue: new Money(9, 'EUR')
      })]
    })),
    /strictement positif/
  );
});
