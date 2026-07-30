import test from 'node:test';
import assert from 'node:assert/strict';

import { Money } from '../../domain/money/Money.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

const validBuyProperties = {
  id: 'transaction_001',
  portfolioId: 'portfolio_main',
  accountId: 'trade_republic',
  assetId: 'IE0002XZSHO1',
  type: Transaction.TYPES.BUY,
  context: Transaction.CONTEXTS.REAL,
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
  assert.equal(transaction.amount, null);
  assert.equal(transaction.hasStandaloneAmount, false);
  assert.equal(transaction.currency, 'EUR');
  assert.equal(transaction.context, Transaction.CONTEXTS.REAL);
  assert.equal(transaction.isConfirmed, true);
  assert.equal(transaction.isReal, true);
  assert.equal(transaction.isSimulation, false);
});

test('utilise le contexte réel pour les anciennes données sans contexte', () => {
  const { context, ...legacyProperties } = validBuyProperties;
  const transaction = new Transaction(legacyProperties);

  assert.equal(transaction.context, Transaction.CONTEXTS.REAL);
  assert.equal(transaction.toJSON().context, Transaction.CONTEXTS.REAL);
});

test('crée et sérialise une transaction simulée', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    context: Transaction.CONTEXTS.SIMULATION
  });

  assert.equal(transaction.context, Transaction.CONTEXTS.SIMULATION);
  assert.equal(transaction.isReal, false);
  assert.equal(transaction.isSimulation, true);
  assert.equal(transaction.toJSON().context, Transaction.CONTEXTS.SIMULATION);
});

test('refuse un contexte inconnu', () => {
  assert.throws(
    () => new Transaction({ ...validBuyProperties, context: 'PAPER' }),
    /context doit être l'une des valeurs/
  );
});

test('calcule les montants monétaires d’un achat', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    fees: 1.5,
    taxes: 0.5
  });

  assert.equal(transaction.grossAmount, 65);
  assert.equal(transaction.totalCost, 67);
  assert.equal(transaction.grossAmountMoney instanceof Money, true);
  assert.deepEqual(transaction.totalCostMoney.toJSON(), { amount: 67, currency: 'EUR' });
  assert.deepEqual(transaction.feesMoney.toJSON(), { amount: 1.5, currency: 'EUR' });
  assert.deepEqual(transaction.taxesMoney.toJSON(), { amount: 0.5, currency: 'EUR' });
});

test('calcule le produit net d’une vente', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    type: Transaction.TYPES.SELL,
    fees: 1.5,
    taxes: 0.5
  });

  assert.equal(transaction.netProceeds, 63);
  assert.deepEqual(transaction.netProceedsMoney.toJSON(), { amount: 63, currency: 'EUR' });
});

test('porte explicitement le montant d’un dépôt sans détourner unitPrice', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    assetId: null,
    type: Transaction.TYPES.DEPOSIT,
    quantity: 0,
    unitPrice: 0,
    amount: 250.75,
    currency: 'usd'
  });

  assert.equal(transaction.amount, 250.75);
  assert.equal(transaction.unitPrice, 0);
  assert.equal(transaction.hasStandaloneAmount, true);
  assert.deepEqual(transaction.amountMoney.toJSON(), { amount: 250.75, currency: 'USD' });
});

test('convertit les anciennes opérations autonomes vers amount', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    assetId: null,
    type: Transaction.TYPES.WITHDRAWAL,
    quantity: 0,
    unitPrice: 100
  });

  assert.equal(transaction.amount, 100);
  assert.equal(transaction.toJSON().amount, 100);
});

test('convertit un ancien dividende quantité × prix vers amount', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    type: Transaction.TYPES.DIVIDEND,
    quantity: 4,
    unitPrice: 1.25
  });

  assert.equal(transaction.amount, 5);
  assert.deepEqual(transaction.amountMoney.toJSON(), { amount: 5, currency: 'EUR' });
});

test('normalise la devise en majuscules', () => {
  const transaction = new Transaction({ ...validBuyProperties, currency: 'eur' });
  assert.equal(transaction.currency, 'EUR');
});

test('normalise un instant avec fuseau explicite', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    executedAt: '2026-07-30T14:00:00+02:00'
  });

  assert.equal(transaction.executedAt, '2026-07-30T12:00:00.000Z');
  assert.equal(transaction.executedAtPrecision, 'INSTANT');
});

test('conserve une date civile sans inventer d’heure', () => {
  const transaction = new Transaction({
    ...validBuyProperties,
    executedAt: '2026-07-30'
  });

  assert.equal(transaction.executedAt, '2026-07-30');
  assert.equal(transaction.executedAtPrecision, 'DATE');
  assert.equal(transaction.toJSON().executedAt, '2026-07-30');
});

test('refuse un horaire local ambigu sans fuseau', () => {
  assert.throws(
    () => new Transaction({
      ...validBuyProperties,
      executedAt: '2026-07-30T14:00:00'
    }),
    /fuseau explicite/
  );
});

test('refuse une date civile impossible', () => {
  assert.throws(
    () => new Transaction({
      ...validBuyProperties,
      executedAt: '2026-02-30'
    }),
    /date civile valide/
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
    () => new Transaction({ ...validBuyProperties, assetId: null }),
    /assetId est obligatoire/
  );
});

test('refuse une quantité nulle pour un achat', () => {
  assert.throws(
    () => new Transaction({ ...validBuyProperties, quantity: 0 }),
    /quantity doit être strictement positive/
  );
});

test('refuse un prix nul pour un achat', () => {
  assert.throws(
    () => new Transaction({ ...validBuyProperties, unitPrice: 0 }),
    /unitPrice doit être strictement positif/
  );
});

test('refuse un montant autonome nul', () => {
  assert.throws(
    () => new Transaction({
      ...validBuyProperties,
      assetId: null,
      type: Transaction.TYPES.DEPOSIT,
      quantity: 0,
      unitPrice: 0,
      amount: 0
    }),
    /amount doit être strictement positif/
  );
});

test('refuse les frais négatifs', () => {
  assert.throws(
    () => new Transaction({ ...validBuyProperties, fees: -1 }),
    /fees doit être un nombre positif ou nul/
  );
});

test('refuse une devise invalide', () => {
  assert.throws(
    () => new Transaction({ ...validBuyProperties, currency: 'EURO' }),
    /code ISO composé de trois lettres/
  );
});

test('produit un objet sérialisable avec le nouveau champ amount', () => {
  const transaction = new Transaction(validBuyProperties);
  const serialized = transaction.toJSON();

  assert.deepEqual(serialized, { ...validBuyProperties, amount: null });
  assert.notEqual(serialized, transaction);
  assert.equal('executedAtPrecision' in serialized, false);
});