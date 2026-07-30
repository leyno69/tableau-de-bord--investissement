import test from 'node:test';
import assert from 'node:assert/strict';

import { CalculatePortfolioAllocation } from '../../application/use-cases/CalculatePortfolioAllocation.js';
import { Money } from '../../domain/money/Money.js';

function valuation(overrides = {}) {
  return {
    baseCurrency: 'EUR',
    positions: overrides.positions ?? [
      {
        assetId: 'WORLD',
        nativeValue: new Money(600, 'EUR'),
        convertedValue: new Money(600, 'EUR')
      },
      {
        assetId: 'US_TECH',
        nativeValue: new Money(200, 'USD'),
        convertedValue: new Money(180, 'EUR')
      }
    ],
    cash: overrides.cash ?? [
      {
        accountId: 'cash-eur',
        balance: new Money(220, 'EUR'),
        convertedValue: new Money(220, 'EUR')
      }
    ],
    positionsValue: overrides.positionsValue ?? new Money(780, 'EUR'),
    cashValue: overrides.cashValue ?? new Money(220, 'EUR'),
    totalValue: overrides.totalValue ?? new Money(1000, 'EUR')
  };
}

function useCase(classifications = {}) {
  return new CalculatePortfolioAllocation({
    assetClassificationProvider: {
      async getClassification(assetId) {
        return classifications[assetId] ?? null;
      }
    }
  });
}

test('calcule les poids des positions, des espèces et des dimensions', async () => {
  const result = await useCase({
    WORLD: { assetClass: 'equity', sector: 'diversified', country: 'global' },
    US_TECH: { assetClass: 'equity', sector: 'technology', country: 'us' }
  }).execute(valuation());

  assert.equal(result.holdings[0].assetId, 'WORLD');
  assert.equal(result.holdings[0].weight, 0.6);
  assert.equal(result.summary.positionsWeight, 0.78);
  assert.equal(result.summary.cashWeight, 0.22);
  assert.deepEqual(result.assetClasses.map(entry => [entry.key, entry.value.amount, entry.weight]), [
    ['EQUITY', 780, 0.78],
    ['CASH', 220, 0.22]
  ]);
  assert.deepEqual(result.currencies.map(entry => [entry.key, entry.value.amount]), [
    ['EUR', 820],
    ['USD', 180]
  ]);
});

test('classe les métadonnées absentes dans UNKNOWN', async () => {
  const result = await useCase().execute(valuation());

  assert.equal(result.sectors[0].key, 'UNKNOWN');
  assert.equal(result.countries[0].key, 'UNKNOWN');
});

test('retourne des poids nuls lorsque le portefeuille vaut zéro', async () => {
  const zero = new Money(0, 'EUR');
  const result = await useCase().execute(valuation({
    positions: [],
    cash: [],
    positionsValue: zero,
    cashValue: zero,
    totalValue: zero
  }));

  assert.equal(result.summary.positionsWeight, null);
  assert.equal(result.summary.cashWeight, null);
  assert.deepEqual(result.holdings, []);
});

test('rend les résultats immuables', async () => {
  const result = await useCase().execute(valuation());

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.holdings), true);
  assert.equal(Object.isFrozen(result.assetClasses[0]), true);
  assert.throws(() => result.holdings.push({}), TypeError);
});

test('refuse les contrats et valorisations invalides', async () => {
  assert.throws(
    () => new CalculatePortfolioAllocation({ assetClassificationProvider: {} }),
    /getClassification/
  );

  await assert.rejects(
    () => useCase().execute({}),
    /positions et valuation.cash/
  );

  await assert.rejects(
    () => useCase({ A: 'equity' }).execute(valuation({
      positions: [{ assetId: 'A', nativeValue: new Money(10, 'EUR'), convertedValue: new Money(10, 'EUR') }],
      cash: [],
      positionsValue: new Money(10, 'EUR'),
      cashValue: new Money(0, 'EUR'),
      totalValue: new Money(10, 'EUR')
    })),
    /classification doit être un objet/
  );
});
