import test from 'node:test';
import assert from 'node:assert/strict';

import { UpdateTransaction } from '../../application/use-cases/UpdateTransaction.js';
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

function createUseCase() {
  const transaction = new Transaction(transactionProperties);
  const repository = new InMemoryTransactionRepository([transaction]);
  const updateTransaction = new UpdateTransaction({
    transactionRepository: repository
  });

  return { transaction, repository, updateTransaction };
}

test('UpdateTransaction remplace une transaction avec les nouvelles valeurs', () => {
  const { transaction, repository, updateTransaction } = createUseCase();

  const result = updateTransaction.execute(transaction.id, {
    quantity: 3,
    unitPrice: 110,
    fees: 2
  });

  assert.ok(result instanceof Transaction);
  assert.notEqual(result, transaction);
  assert.equal(result.quantity, 3);
  assert.equal(result.unitPrice, 110);
  assert.equal(result.fees, 2);
  assert.equal(repository.size, 1);
  assert.equal(repository.findById(transaction.id), result);
});

test("UpdateTransaction conserve l'identifiant et la date de création", () => {
  const { transaction, updateTransaction } = createUseCase();

  const result = updateTransaction.execute(transaction.id, {
    id: 'different-id',
    createdAt: '2030-01-01T00:00:00.000Z',
    unitPrice: 120
  });

  assert.equal(result.id, transaction.id);
  assert.equal(result.createdAt, transaction.createdAt);
});

test('UpdateTransaction conserve les propriétés non modifiées', () => {
  const { transaction, updateTransaction } = createUseCase();

  const result = updateTransaction.execute(transaction.id, {
    unitPrice: 125
  });

  assert.equal(result.portfolioId, transaction.portfolioId);
  assert.equal(result.accountId, transaction.accountId);
  assert.equal(result.assetId, transaction.assetId);
  assert.equal(result.quantity, transaction.quantity);
  assert.equal(result.currency, transaction.currency);
});

test('UpdateTransaction délègue la revalidation à Transaction', () => {
  const { transaction, repository, updateTransaction } = createUseCase();

  assert.throws(
    () => updateTransaction.execute(transaction.id, { quantity: 0 }),
    RangeError
  );
  assert.equal(repository.findById(transaction.id), transaction);
});

test('UpdateTransaction refuse une transaction introuvable', () => {
  const { repository, updateTransaction } = createUseCase();

  assert.throws(
    () => updateTransaction.execute('unknown-transaction', { fees: 2 }),
    /introuvable/
  );
  assert.equal(repository.size, 1);
});

test('UpdateTransaction valide ses arguments et le dépôt', () => {
  const { updateTransaction } = createUseCase();

  assert.throws(() => updateTransaction.execute('', {}), /id/);
  assert.throws(
    () => updateTransaction.execute('transaction-1', null),
    /changes/
  );

  assert.throws(
    () => new UpdateTransaction({ transactionRepository: null }),
    /obligatoire/
  );
  assert.throws(
    () =>
      new UpdateTransaction({
        transactionRepository: { findById() {} }
      }),
    /save/
  );
});
