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

test('AddTransaction crée et enregistre une transaction', async () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({ transactionRepository: repository });

  const result = await addTransaction.execute(transactionProperties);

  assert.ok(result instanceof Transaction);
  assert.equal(result.id, 'transaction-1');
  assert.equal(repository.size, 1);
  assert.equal(await repository.findById('transaction-1'), result);
});

test('AddTransaction accepte une instance de Transaction existante', async () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({ transactionRepository: repository });
  const transaction = new Transaction(transactionProperties);

  const result = await addTransaction.execute(transaction);

  assert.equal(result, transaction);
  assert.equal(await repository.findById(transaction.id), transaction);
});

test('AddTransaction refuse un identifiant déjà utilisé', async () => {
  const existingTransaction = new Transaction(transactionProperties);
  const repository = new InMemoryTransactionRepository([existingTransaction]);
  const addTransaction = new AddTransaction({ transactionRepository: repository });

  await assert.rejects(
    () => addTransaction.execute(transactionProperties),
    /existe déjà/
  );
  assert.equal(repository.size, 1);
  assert.equal(await repository.findById(existingTransaction.id), existingTransaction);
});

test('AddTransaction délègue la validation à Transaction', async () => {
  const repository = new InMemoryTransactionRepository();
  const addTransaction = new AddTransaction({ transactionRepository: repository });

  await assert.rejects(
    () => addTransaction.execute({ ...transactionProperties, quantity: 0 }),
    RangeError
  );
  assert.equal(repository.size, 0);
});

test('AddTransaction attend les dépôts asynchrones avant de contrôler l’unicité', async () => {
  const existing = new Transaction(transactionProperties);
  const repository = {
    async findById() { return existing; },
    async save() { throw new Error('save ne doit pas être appelé'); }
  };
  const addTransaction = new AddTransaction({ transactionRepository: repository });

  await assert.rejects(() => addTransaction.execute(transactionProperties), /existe déjà/);
});

test('AddTransaction exige un dépôt compatible', () => {
  assert.throws(
    () => new AddTransaction({ transactionRepository: null }),
    /obligatoire/
  );

  assert.throws(
    () => new AddTransaction({ transactionRepository: { save() {} } }),
    /findById/
  );
});
