import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

function transaction(overrides = {}) {
  return new Transaction({
    id: 'tx_001',
    portfolioId: 'portfolio_main',
    accountId: 'trade_republic',
    assetId: 'asset_world',
    type: Transaction.TYPES.BUY,
    quantity: 10,
    unitPrice: 5,
    fees: 0,
    taxes: 0,
    currency: 'EUR',
    executedAt: '2026-07-30T10:00:00.000Z',
    status: Transaction.STATUSES.CONFIRMED,
    createdAt: '2026-07-30T10:01:00.000Z',
    ...overrides
  });
}

test('reconstruit une position à partir d’un achat', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction()
  ]);

  assert.equal(position.assetId, 'asset_world');
  assert.equal(position.quantity, 10);
  assert.equal(position.totalCost, 50);
  assert.equal(position.averageCost, 5);
});

test('calcule un prix de revient moyen pondéré', () => {
  const positions = PortfolioLedger.rebuildPositions([
    transaction({
      id: 'tx_001',
      quantity: 10,
      unitPrice: 5
    }),
    transaction({
      id: 'tx_002',
      quantity: 5,
      unitPrice: 8,
      executedAt: '2026-07-30T11:00:00.000Z'
    })
  ]);

  assert.equal(positions[0].quantity, 15);
  assert.equal(positions[0].totalCost, 90);
  assert.equal(positions[0].averageCost, 6);
});

test('intègre les frais et taxes d’achat au coût', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction({ fees: 1.5, taxes: 0.5 })
  ]);

  assert.equal(position.totalCost, 52);
  assert.equal(position.averageCost, 5.2);
});

test('calcule le résultat réalisé lors d’une vente', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction({
      id: 'tx_buy',
      quantity: 10,
      unitPrice: 5
    }),
    transaction({
      id: 'tx_sell',
      type: Transaction.TYPES.SELL,
      quantity: 4,
      unitPrice: 8,
      fees: 1,
      executedAt: '2026-07-30T11:00:00.000Z'
    })
  ]);

  assert.equal(position.quantity, 6);
  assert.equal(position.totalCost, 30);
  assert.equal(position.averageCost, 5);
  assert.equal(position.realizedPnL, 11);
});

test('remet le coût et le PRU à zéro après une vente totale', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction({ id: 'tx_buy' }),
    transaction({
      id: 'tx_sell',
      type: Transaction.TYPES.SELL,
      quantity: 10,
      unitPrice: 6,
      executedAt: '2026-07-30T11:00:00.000Z'
    })
  ]);

  assert.equal(position.quantity, 0);
  assert.equal(position.totalCost, 0);
  assert.equal(position.averageCost, 0);
  assert.equal(position.realizedPnL, 10);
});

test('cumule les dividendes nets', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction({ id: 'tx_buy' }),
    transaction({
      id: 'tx_dividend',
      type: Transaction.TYPES.DIVIDEND,
      quantity: 0,
      unitPrice: 12,
      taxes: 2,
      executedAt: '2026-07-30T11:00:00.000Z'
    })
  ]);

  assert.equal(position.dividends, 10);
});

test('ignore les transactions non confirmées', () => {
  const [position] = PortfolioLedger.rebuildPositions([
    transaction({ id: 'tx_confirmed' }),
    transaction({
      id: 'tx_cancelled',
      quantity: 100,
      status: Transaction.STATUSES.CANCELLED,
      executedAt: '2026-07-30T11:00:00.000Z'
    })
  ]);

  assert.equal(position.quantity, 10);
});

test('reconstruit séparément les actifs', () => {
  const positions = PortfolioLedger.rebuildPositions([
    transaction({ id: 'tx_world' }),
    transaction({
      id: 'tx_asia',
      assetId: 'asset_asia',
      quantity: 3,
      unitPrice: 20
    })
  ]);

  assert.equal(positions.length, 2);
  assert.equal(
    positions.find(position => position.assetId === 'asset_asia').quantity,
    3
  );
});

test('refuse une vente supérieure à la quantité détenue', () => {
  assert.throws(
    () =>
      PortfolioLedger.rebuildPositions([
        transaction({ id: 'tx_buy', quantity: 2 }),
        transaction({
          id: 'tx_sell',
          type: Transaction.TYPES.SELL,
          quantity: 3,
          unitPrice: 8,
          executedAt: '2026-07-30T11:00:00.000Z'
        })
      ]),
    /dépasse la quantité détenue/
  );
});

test('refuse de mélanger plusieurs devises dans une position', () => {
  assert.throws(
    () =>
      PortfolioLedger.rebuildPositions([
        transaction({ id: 'tx_eur' }),
        transaction({
          id: 'tx_usd',
          currency: 'USD',
          executedAt: '2026-07-30T11:00:00.000Z'
        })
      ]),
    /mélange les devises/
  );
});

test('reconstruit une position précise', () => {
  const position = PortfolioLedger.rebuildPosition({
    transactions: [
      transaction(),
      transaction({
        id: 'tx_other',
        assetId: 'asset_asia',
        quantity: 2,
        unitPrice: 20
      })
    ],
    portfolioId: 'portfolio_main',
    accountId: 'trade_republic',
    assetId: 'asset_world'
  });

  assert.equal(position.assetId, 'asset_world');
  assert.equal(position.quantity, 10);
});
