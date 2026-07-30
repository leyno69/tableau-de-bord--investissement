import test from 'node:test';
import assert from 'node:assert/strict';

import { AddTransaction } from '../../application/use-cases/AddTransaction.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

const transactionProperties = {
  id: 'transaction-1',
  portfolioId: 'portfolio-1',
  accountId: 'account-1',
  assetId: 'asset-1',
  type: Transaction.TYPES.BUY,
  quantity: 2,
  unitPrice: 100,
  fees: 1,
  taxes: 0,
  currency: 'EUR',
  executedAt: '2026-01-15T10:00:00.000Z',
  createdAt: '2026-01-15T10:00:00.000Z'
};

test('AddTransaction crée et enregistre une transaction', () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({
    transactionRepository: repository
  });

  const result = addTransaction.execute(transactionProperties);

  assert.ok(result instanceof Transaction);
  assert.equal(result.id, 'transaction-1');
  assert.equal(repository.size, 1);
  assert.equal(repository.findById('transaction-1'), result);
});

test('AddTransaction accepte une instance de Transaction existante', () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({
    transactionRepository: repository
  });
  const transaction = new Transaction(transactionProperties);

  const result = addTransaction.execute(transaction);

  assert.equal(result, transaction);
  assert.equal(repository.findById(transaction.id), transaction);
});

test('AddTransaction refuse un identifiant déjà utilisé', () => {
  const existingTransaction = new Transaction(transactionProperties);
  const repository = new InMemoryTransactionRepository([
    existingTransaction
  ]);
  const addTransaction = new AddTransaction({
    transactionRepository: repository
  });

  assert.throws(
    () => addTransaction.execute(transactionProperties),
    /existe déjà/
  );
  assert.equal(repository.size, 1);
  assert.equal(repository.findById(existingTransaction.id), existingTransaction);
});

test('AddTransaction délègue la validation à Transaction', () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({
    transactionRepository: repository
  });

  assert.throws(
    () =>
      addTransaction.execute({
        ...transactionProperties,
        quantity: 0
      }),
    RangeError
  );
  assert.equal(repository.size, 0);
});

test('AddTransaction exige un dépôt compatible', () => {
  assert.throws(
    () => new AddTransaction({ transactionRepository: null }),
    /obligatoire/
  );

  assert.throws(
    () =>
      new AddTransaction({
        transactionRepository: { save() {} }
      }),
    /findById/
  );
});
