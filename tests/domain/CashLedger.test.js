import test from 'node:test';
import assert from 'node:assert/strict';
import { CashLedger } from '../../domain/cash/CashLedger.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

function transaction(overrides = {}) {
  return new Transaction({
    id: overrides.id ?? crypto.randomUUID(),
    portfolioId: overrides.portfolioId ?? 'portfolio-1',
    accountId: overrides.accountId ?? 'account-1',
    assetId: overrides.assetId ?? null,
    type: overrides.type ?? Transaction.TYPES.DEPOSIT,
    quantity: overrides.quantity ?? 0,
    unitPrice: overrides.unitPrice ?? 0,
    fees: overrides.fees ?? 0,
    taxes: overrides.taxes ?? 0,
    currency: overrides.currency ?? 'EUR',
    executedAt: overrides.executedAt ?? '2026-01-01',
    status: overrides.status ?? Transaction.STATUSES.CONFIRMED,
    context: overrides.context ?? Transaction.CONTEXTS.REAL,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z'
  });
}

test('reconstruit un solde avec dépôt, achat, dividende, vente, frais et retrait', () => {
  const balances = CashLedger.rebuildBalances([
    transaction({ id: '1', type: Transaction.TYPES.DEPOSIT, unitPrice: 1000 }),
    transaction({
      id: '2',
      type: Transaction.TYPES.BUY,
      assetId: 'ETF-WORLD',
      quantity: 2,
      unitPrice: 100,
      fees: 1
    }),
    transaction({
      id: '3',
      type: Transaction.TYPES.DIVIDEND,
      assetId: 'ETF-WORLD',
      unitPrice: 10,
      taxes: 1
    }),
    transaction({
      id: '4',
      type: Transaction.TYPES.SELL,
      assetId: 'ETF-WORLD',
      quantity: 1,
      unitPrice: 120,
      fees: 1,
      taxes: 2
    }),
    transaction({ id: '5', type: Transaction.TYPES.FEE, unitPrice: 3 }),
    transaction({ id: '6', type: Transaction.TYPES.WITHDRAWAL, unitPrice: 100, fees: 1 })
  ]);

  assert.deepEqual(balances, [{
    portfolioId: 'portfolio-1',
    accountId: 'account-1',
    currency: 'EUR',
    balance: 821
  }]);
});

test('sépare les soldes par compte et par devise', () => {
  const balances = CashLedger.rebuildBalances([
    transaction({ id: '1', accountId: 'account-b', currency: 'USD', unitPrice: 50 }),
    transaction({ id: '2', accountId: 'account-a', currency: 'EUR', unitPrice: 100 }),
    transaction({ id: '3', accountId: 'account-a', currency: 'USD', unitPrice: 25 })
  ]);

  assert.deepEqual(balances, [
    { portfolioId: 'portfolio-1', accountId: 'account-a', currency: 'EUR', balance: 100 },
    { portfolioId: 'portfolio-1', accountId: 'account-a', currency: 'USD', balance: 25 },
    { portfolioId: 'portfolio-1', accountId: 'account-b', currency: 'USD', balance: 50 }
  ]);
});

test('ignore les transactions en attente ou annulées', () => {
  const balances = CashLedger.rebuildBalances([
    transaction({ id: '1', unitPrice: 100 }),
    transaction({ id: '2', unitPrice: 200, status: Transaction.STATUSES.PENDING }),
    transaction({ id: '3', unitPrice: 300, status: Transaction.STATUSES.CANCELLED })
  ]);

  assert.equal(balances[0].balance, 100);
});

test('retourne des collections profondément immuables au premier niveau', () => {
  const balances = CashLedger.rebuildBalances([
    transaction({ unitPrice: 100 })
  ]);

  assert.equal(Object.isFrozen(balances), true);
  assert.equal(Object.isFrozen(balances[0]), true);
});

test('calcule explicitement chaque impact espèces', () => {
  assert.equal(CashLedger.cashDelta(transaction({
    type: Transaction.TYPES.BUY,
    assetId: 'A',
    quantity: 2,
    unitPrice: 10,
    fees: 1,
    taxes: 2
  })), -23);

  assert.equal(CashLedger.cashDelta(transaction({
    type: Transaction.TYPES.SELL,
    assetId: 'A',
    quantity: 2,
    unitPrice: 10,
    fees: 1,
    taxes: 2
  })), 17);

  assert.equal(CashLedger.cashDelta(transaction({
    type: Transaction.TYPES.DEPOSIT,
    unitPrice: 100,
    fees: 1,
    taxes: 2
  })), 97);

  assert.equal(CashLedger.cashDelta(transaction({
    type: Transaction.TYPES.WITHDRAWAL,
    unitPrice: 100,
    fees: 1,
    taxes: 2
  })), -103);
});

test('refuse les entrées qui ne sont pas des transactions', () => {
  assert.throws(() => CashLedger.rebuildBalances({}), TypeError);
  assert.throws(() => CashLedger.rebuildBalances([{}]), TypeError);
  assert.throws(() => CashLedger.cashDelta({}), TypeError);
});
