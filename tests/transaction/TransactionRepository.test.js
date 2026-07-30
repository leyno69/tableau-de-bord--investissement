import test from 'node:test';
import assert from 'node:assert/strict';

import { TransactionRepository } from '../../domain/transaction/TransactionRepository.js';

test('TransactionRepository expose explicitement ses opérations', () => {
  const repository = new TransactionRepository();

  assert.throws(() => repository.save({}), /save doit être implémentée/);
  assert.throws(() => repository.findById('tx-1'), /findById doit être implémentée/);
  assert.throws(() => repository.findAll(), /findAll doit être implémentée/);
  assert.throws(
    () => repository.findByPortfolioId('portfolio-1'),
    /findByPortfolioId doit être implémentée/
  );
  assert.throws(
    () => repository.deleteById('tx-1'),
    /deleteById doit être implémentée/
  );
});
