import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Transaction
} from '../../domain/transaction/Transaction.js';

const validBuyProperties = {
  id: 'transaction_001',
  portfolioId: 'portfolio_main',
  accountId: 'trade_republic',
  assetId: 'IE0002XZSHO1',
  type: Transaction.TYPES.BUY,
  quantity: 10,
  unitPrice: 6.5,
  fees: 1,
  taxes: 0,
  currency: 'EUR',
  executedAt: '2026-07-30T12:00:00.000Z',
  status: Transaction.STATUSES.CONFIRMED,
  createdAt: '2026-07-30T12:01:00.000Z'
};

test('crée une transaction d’achat valide', () => {
  const transaction = new Transaction(validBuyProperties);

  assert.equal(transaction.id, 'transaction_001');
  assert.equal(transaction.quantity, 10);
  assert.equal(transaction.unitPrice, 6.5);
  assert.equal(transaction.currency, 'EUR');
  assert.equal(transaction.isConfirmed, true);
});

test('calcule le montant brut', () => {
  const transaction = new Transaction(validBuyProperties);

  assert.equal(transaction.grossAmount, 65);
});

test('calcule le coût total avec les frais et les taxes', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    fees: 1.5,
    taxes: 0.5
  });

  assert.equal(transaction.totalCost, 67);
});

test('calcule le produit net d’une vente', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    type: Transaction.TYPES.SELL,
    fees: 1.5,
    taxes: 0.5
  });

  assert.equal(transaction.netProceeds, 63);
});

test('normalise la devise en majuscules', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    currency: 'eur'
  });

  assert.equal(transaction.currency, 'EUR');
});

test('normalise les dates au format ISO', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    executedAt: '2026-07-30 14:00:00+02:00'
  });

  assert.equal(
    transaction.executedAt,
    '2026-07-30T12:00:00.000Z'
  );
});

test('rend la transaction immuable', () => {
  const transaction = new Transaction(validBuyProperties);

  assert.equal(Object.isFrozen(transaction), true);

  assert.throws(() => {
    transaction.quantity = 100;
  }, TypeError);

  assert.equal(transaction.quantity, 10);
});

test('refuse un achat sans actif', () => {
  assert.throws(
    () =>
      new Transaction({
        ...validBuyProperties,
        assetId: null
      }),
    /assetId est obligatoire/
  );
});

test('refuse une quantité nulle pour un achat', () => {
  assert.throws(
    () =>
      new Transaction({
        ...validBuyProperties,
        quantity: 0
      }),
    /quantity doit être strictement positive/
  );
});

test('refuse un prix nul pour un achat', () => {
  assert.throws(
    () =>
      new Transaction({
        ...validBuyProperties,
        unitPrice: 0
      }),
    /unitPrice doit être strictement positif/
  );
});

test('refuse les frais négatifs', () => {
  assert.throws(
    () =>
      new Transaction({
        ...validBuyProperties,
        fees: -1
      }),
    /fees doit être un nombre positif ou nul/
  );
});

test('refuse une devise invalide', () => {
  assert.throws(
    () =>
      new Transaction({
        ...validBuyProperties,
        currency: 'EURO'
      }),
    /code ISO composé de trois lettres/
  );
});

test('produit un objet sérialisable', () => {
  const transaction = new Transaction(validBuyProperties);
  const serialized = transaction.toJSON();

  assert.deepEqual(serialized, validBuyProperties);
  assert.notEqual(serialized, transaction);
});