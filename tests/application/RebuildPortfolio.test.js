import test from 'node:test';
import assert from 'node:assert/strict';

import { RebuildPortfolio } from '../../application/use-cases/RebuildPortfolio.js';
import { Position } from '../../domain/position/Position.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

const createTransaction = (overrides = {}) =>
  new Transaction({
    id: 'transaction-1',
    portfolioId: 'portfolio-1',
    accountId: 'account-1',
    assetId: 'asset-1',
    type: Transaction.TYPES.BUY,
    quantity: 2,
    unitPrice: 100,
    fees: 0,
    taxes: 0,
    currency: 'EUR',
    executedAt: '2026-01-15T10:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    ...overrides
  });

test('RebuildPortfolio reconstruit les positions du portefeuille demandé', () => {
  const repository = new InMemoryTransactionRepository([
    createTransaction({
      id: 'transaction-2',
      quantity: 1,
      unitPrice: 130,
      executedAt: '2026-02-01T10:00:00.000Z'
    }),
    createTransaction(),
    createTransaction({
      id: 'transaction-other-portfolio',
      portfolioId: 'portfolio-2',
      quantity: 50
    })
  ]);
  const rebuildPortfolio = new RebuildPortfolio({
    transactionRepository: repository
  });

  const result = rebuildPortfolio.execute('portfolio-1');

  assert.equal(result.portfolioId, 'portfolio-1');
  assert.equal(result.transactions.length, 2);
  assert.deepEqual(
    result.transactions.map(transaction => transaction.id),
    ['transaction-1', 'transaction-2']
  );
  assert.equal(result.positions.length, 1);
  assert.ok(result.positions[0] instanceof Position);
  assert.deepEqual(result.positions[0].toJSON(), {
    assetId: 'asset-1',
    quantity: 3,
    totalCost: 330,
    averageCost: 110,
    realizedPnL: 0,
    dividends: 0,
    currency: 'EUR'
  });
});

test('RebuildPortfolio retourne un portefeuille vide sans transaction', () => {
  const rebuildPortfolio = new RebuildPortfolio({
    transactionRepository: new InMemoryTransactionRepository()
  });

  const result = rebuildPortfolio.execute('portfolio-empty');

  assert.deepEqual(result.transactions, []);
  assert.deepEqual(result.positions, []);
});

test('RebuildPortfolio normalise l’identifiant du portefeuille', () => {
  const transaction = createTransaction();
  const repository = new InMemoryTransactionRepository([transaction]);
  const rebuildPortfolio = new RebuildPortfolio({
    transactionRepository: repository
  });

  const result = rebuildPortfolio.execute('  portfolio-1  ');

  assert.equal(result.portfolioId, 'portfolio-1');
  assert.equal(result.transactions[0], transaction);
});

test('RebuildPortfolio retourne un résultat immuable', () => {
  const rebuildPortfolio = new RebuildPortfolio({
    transactionRepository: new InMemoryTransactionRepository([
      createTransaction()
    ])
  });

  const result = rebuildPortfolio.execute('portfolio-1');

  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.transactions));
  assert.ok(Object.isFrozen(result.positions));
});

test('RebuildPortfolio valide son entrée et son dépôt', () => {
  assert.throws(
    () => new RebuildPortfolio({ transactionRepository: null }),
    /obligatoire/
  );
  assert.throws(
    () =>
      new RebuildPortfolio({
        transactionRepository: {}
      }),
    /findByPortfolioId/
  );

  const rebuildPortfolio = new RebuildPortfolio({
    transactionRepository: {
      findByPortfolioId() {
        return null;
      }
    }
  });

  assert.throws(() => rebuildPortfolio.execute(''), /portfolioId/);
  assert.throws(
    () => rebuildPortfolio.execute('portfolio-1'),
    /retourner un tableau/
  );
});
