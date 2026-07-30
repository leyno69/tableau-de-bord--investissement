import test from 'node:test';
import assert from 'node:assert/strict';

import { TransactionAccountValidator } from '../../application/services/TransactionAccountValidator.js';
import { Account } from '../../domain/account/Account.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

const createAccount = (overrides = {}) => new Account({
  id: 'account_trade_republic_cto',
  portfolioId: 'portfolio_main',
  name: 'Trade Republic — CTO',
  providerId: 'TRADE_REPUBLIC',
  kind: Account.KINDS.SECURITIES,
  taxWrapper: Account.TAX_WRAPPERS.CTO,
  currency: 'EUR',
  status: Account.STATUSES.ACTIVE,
  ...overrides
});

const createTransaction = (overrides = {}) => new Transaction({
  id: 'transaction_001',
  portfolioId: 'portfolio_main',
  accountId: 'account_trade_republic_cto',
  assetId: 'IE0002XZSHO1',
  type: Transaction.TYPES.BUY,
  quantity: 10,
  unitPrice: 6.5,
  currency: 'EUR',
  executedAt: '2026-07-30T12:00:00.000Z',
  createdAt: '2026-07-30T12:01:00.000Z',
  ...overrides
});

const createRepository = (account) => ({
  findById(id) {
    return account?.id === id ? account : null;
  }
});

test('valide une transaction rattachée à un compte actif du même portefeuille', () => {
  const account = createAccount();
  const validator = new TransactionAccountValidator({
    accountRepository: createRepository(account)
  });

  assert.equal(validator.validate(createTransaction()), account);
});

test('refuse une transaction qui référence un compte inexistant', () => {
  const validator = new TransactionAccountValidator({
    accountRepository: createRepository(null)
  });

  assert.throws(
    () => validator.validate(createTransaction()),
    /compte .* introuvable/
  );
});

test('refuse un compte appartenant à un autre portefeuille', () => {
  const account = createAccount({ portfolioId: 'portfolio_other' });
  const validator = new TransactionAccountValidator({
    accountRepository: createRepository(account)
  });

  assert.throws(
    () => validator.validate(createTransaction()),
    /n'appartient pas au portefeuille/
  );
});

test('refuse une nouvelle transaction sur un compte fermé', () => {
  const account = createAccount({ status: Account.STATUSES.CLOSED });
  const validator = new TransactionAccountValidator({
    accountRepository: createRepository(account)
  });

  assert.throws(
    () => validator.validate(createTransaction()),
    /compte .* est fermé/
  );
});

test('refuse un dépôt qui retourne autre chose qu’un Account', () => {
  const validator = new TransactionAccountValidator({
    accountRepository: {
      findById() {
        return {
          id: 'account_trade_republic_cto',
          portfolioId: 'portfolio_main',
          status: Account.STATUSES.ACTIVE
        };
      }
    }
  });

  assert.throws(
    () => validator.validate(createTransaction()),
    /instance de Account/
  );
});

test('refuse un dépôt sans findById', () => {
  assert.throws(
    () => new TransactionAccountValidator({ accountRepository: {} }),
    /findById/
  );
});

test('refuse une référence de transaction incomplète', () => {
  const validator = new TransactionAccountValidator({
    accountRepository: createRepository(createAccount())
  });

  assert.throws(
    () => validator.validate({ portfolioId: 'portfolio_main', accountId: ' ' }),
    /transaction.accountId doit être une chaîne non vide/
  );
});
