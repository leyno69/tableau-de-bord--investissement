import test from 'node:test';
import assert from 'node:assert/strict';

import { DeleteTransaction } from '../../application/use-cases/DeleteTransaction.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

function createTransaction(overrides = {}) {
  return new Transaction({
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
    executedAt: '2026-01-10T10:00:00.000Z',
    status: Transaction.STATUSES.CONFIRMED,
    createdAt: '2026-01-10T10:00:00.000Z',
    ...overrides
  });
}

test('supprime une transaction existante et la retourne', () => {
  const transaction = createTransaction();
  const repository = new InMemoryTransactionRepository([transaction]);
  const deleteTransaction = new DeleteTransaction(repository);

  const deletedTransaction = deleteTransaction.execute(' transaction-1 ');

  assert.equal(deletedTransaction, transaction);
  assert.equal(repository.findById('transaction-1'), null);
  assert.equal(repository.size, 0);
});

test('refuse un identifiant vide', () => {
  const repository = new InMemoryTransactionRepository();
  const deleteTransaction = new DeleteTransaction(repository);

  assert.throws(
    () => deleteTransaction.execute('  '),
    /id doit être une chaîne non vide/
  );
});

test("échoue lorsque la transaction n'existe pas", () => {
  const repository = new InMemoryTransactionRepository();
  const deleteTransaction = new DeleteTransaction(repository);

  assert.throws(
    () => deleteTransaction.execute('transaction-404'),
    /Transaction introuvable : transaction-404/
  );
});

test('refuse un dépôt incompatible', () => {
  assert.throws(
    () => new DeleteTransaction({ findById() {} }),
    /transactionRepository doit fournir findById\(\) et deleteById\(\)/
  );
});

test('signale une suppression incohérente du dépôt', () => {
  const transaction = createTransaction();
  const repository = {
    findById() {
      return transaction;
    },
    deleteById() {
      return false;
    }
  };

  const deleteTransaction = new DeleteTransaction(repository);

  assert.throws(
    () => deleteTransaction.execute(transaction.id),
    /La suppression de la transaction transaction-1 a échoué/
  );
});
