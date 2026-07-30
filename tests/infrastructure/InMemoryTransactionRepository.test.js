import test from 'node:test';
import assert from 'node:assert/strict';

import { Transaction } from '../../domain/transaction/Transaction.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

function createTransaction(overrides = {}) {
  return new Transaction({
    id: 'tx-1',
    portfolioId: 'portfolio-1',
    accountId: 'account-1',
    assetId: 'asset-1',
    type: Transaction.TYPES.BUY,
    quantity: 2,
    unitPrice: 100,
    fees: 1,
    taxes: 0,
    currency: 'EUR',
    executedAt: '2026-01-10T10:00:00.000Z',
    createdAt: '2026-01-10T10:00:00.000Z',
    ...overrides
  });
}

test('enregistre et retrouve une transaction par son identifiant', () => {
  const repository = new InMemoryTransactionRepository();
  const transaction = createTransaction();

  repository.save(transaction);

  assert.equal(repository.findById('tx-1'), transaction);
  assert.equal(repository.size, 1);
});

test('remplace une transaction portant le même identifiant', () => {
  const repository = new InMemoryTransactionRepository();
  const initial = createTransaction();
  const replacement = createTransaction({ unitPrice: 125 });

  repository.save(initial);
  repository.save(replacement);

  assert.equal(repository.size, 1);
  assert.equal(repository.findById('tx-1'), replacement);
});

test('filtre les transactions par portefeuille', () => {
  const first = createTransaction();
  const second = createTransaction({
    id: 'tx-2',
    portfolioId: 'portfolio-2'
  });
  const repository = new InMemoryTransactionRepository([first, second]);

  assert.deepEqual(repository.findByPortfolioId('portfolio-1'), [first]);
});

test('supprime une transaction et indique si elle existait', () => {
  const repository = new InMemoryTransactionRepository([createTransaction()]);

  assert.equal(repository.deleteById('tx-1'), true);
  assert.equal(repository.deleteById('tx-1'), false);
  assert.equal(repository.findById('tx-1'), null);
});

test('refuse les valeurs qui ne sont pas des transactions', () => {
  const repository = new InMemoryTransactionRepository();

  assert.throws(
    () => repository.save({ id: 'tx-1' }),
    /instance de Transaction/
  );
});

test('clear vide entièrement le dépôt', () => {
  const repository = new InMemoryTransactionRepository([createTransaction()]);

  repository.clear();

  assert.deepEqual(repository.findAll(), []);
  assert.equal(repository.size, 0);
});
