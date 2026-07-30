import test from 'node:test';
import assert from 'node:assert/strict';

import { RegisterTransaction } from '../../application/use-cases/RegisterTransaction.js';
import { Account } from '../../domain/account/Account.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

const account = new Account({
  id: 'account_trade_republic',
  portfolioId: 'portfolio_main',
  name: 'Trade Republic — CTO',
  providerId: 'TRADE_REPUBLIC',
  kind: Account.KINDS.SECURITIES,
  taxWrapper: Account.TAX_WRAPPERS.CTO,
  currency: 'EUR'
});

const transactionProperties = {
  id: 'transaction_001',
  portfolioId: 'portfolio_main',
  accountId: account.id,
  assetId: 'IE0002XZSHO1',
  type: Transaction.TYPES.BUY,
  quantity: 2,
  unitPrice: 10,
  currency: 'EUR',
  executedAt: '2026-07-30'
};

function createRepositories({ storedAccount = account, saveResult } = {}) {
  const savedTransactions = [];

  return {
    savedTransactions,
    accountRepository: {
      findById(id) {
        return id === storedAccount?.id ? storedAccount : null;
      }
    },
    transactionRepository: {
      save(transaction) {
        savedTransactions.push(transaction);
        return saveResult;
      }
    }
  };
}

test('construit, valide et persiste une transaction', () => {
  const repositories = createRepositories();
  const useCase = new RegisterTransaction(repositories);

  const transaction = useCase.execute(transactionProperties);

  assert.equal(transaction instanceof Transaction, true);
  assert.equal(transaction.id, 'transaction_001');
  assert.deepEqual(repositories.savedTransactions, [transaction]);
});

test('accepte une transaction déjà construite', () => {
  const repositories = createRepositories();
  const useCase = new RegisterTransaction(repositories);
  const transaction = new Transaction(transactionProperties);

  const result = useCase.execute(transaction);

  assert.equal(result, transaction);
  assert.equal(repositories.savedTransactions[0], transaction);
});

test('retourne la transaction renvoyée par le dépôt', () => {
  const persisted = new Transaction({
    ...transactionProperties,
    createdAt: '2026-07-30T20:00:00.000Z'
  });
  const repositories = createRepositories({ saveResult: persisted });
  const useCase = new RegisterTransaction(repositories);

  assert.equal(useCase.execute(transactionProperties), persisted);
});

test('ne persiste pas une transaction dont le compte est introuvable', () => {
  const repositories = createRepositories({ storedAccount: null });
  const useCase = new RegisterTransaction(repositories);

  assert.throws(
    () => useCase.execute(transactionProperties),
    /référencé par la transaction est introuvable/
  );
  assert.deepEqual(repositories.savedTransactions, []);
});

test('ne persiste pas une transaction rattachée à un autre portefeuille', () => {
  const foreignAccount = new Account({
    ...account.toJSON(),
    portfolioId: 'portfolio_other'
  });
  const repositories = createRepositories({ storedAccount: foreignAccount });
  const useCase = new RegisterTransaction(repositories);

  assert.throws(
    () => useCase.execute(transactionProperties),
    /n'appartient pas au portefeuille/
  );
  assert.deepEqual(repositories.savedTransactions, []);
});

test('ne persiste pas une transaction sur un compte fermé', () => {
  const closedAccount = new Account({
    ...account.toJSON(),
    status: Account.STATUSES.CLOSED
  });
  const repositories = createRepositories({ storedAccount: closedAccount });
  const useCase = new RegisterTransaction(repositories);

  assert.throws(
    () => useCase.execute(transactionProperties),
    /est fermé/
  );
  assert.deepEqual(repositories.savedTransactions, []);
});

test('valide les contrats des dépôts', () => {
  assert.throws(
    () => new RegisterTransaction({
      accountRepository: { findById() {} },
      transactionRepository: {}
    }),
    /save\(\)/
  );

  assert.throws(
    () => new RegisterTransaction({
      accountRepository: {},
      transactionRepository: { save() {} }
    }),
    /findById\(\)/
  );
});

test('refuse une valeur de retour invalide du dépôt', () => {
  const repositories = createRepositories({ saveResult: { id: 'raw' } });
  const useCase = new RegisterTransaction(repositories);

  assert.throws(
    () => useCase.execute(transactionProperties),
    /save\(\) doit retourner une instance de Transaction/
  );
});
