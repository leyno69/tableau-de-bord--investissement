import test from 'node:test';
import assert from 'node:assert/strict';

import { BuildPortfolioOverview } from '../../application/use-cases/BuildPortfolioOverview.js';
import { Account } from '../../domain/account/Account.js';
import { Portfolio } from '../../domain/portfolio/Portfolio.js';

const portfolio = new Portfolio({
  id: 'portfolio_main',
  name: 'Patrimoine principal',
  baseCurrency: 'EUR'
});

const accounts = [
  new Account({
    id: 'revolut_cash_usd',
    portfolioId: portfolio.id,
    name: 'Revolut — Espèces USD',
    providerId: 'REVOLUT',
    kind: Account.KINDS.CASH,
    currency: 'USD'
  }),
  new Account({
    id: 'trade_republic_cto',
    portfolioId: portfolio.id,
    name: 'Trade Republic — CTO',
    providerId: 'TRADE_REPUBLIC',
    kind: Account.KINDS.SECURITIES,
    taxWrapper: Account.TAX_WRAPPERS.CTO,
    currency: 'EUR'
  }),
  new Account({
    id: 'revolut_stocks',
    portfolioId: portfolio.id,
    name: 'Revolut — Titres',
    providerId: 'REVOLUT',
    kind: Account.KINDS.SECURITIES,
    currency: 'EUR'
  }),
  new Account({
    id: 'legacy_closed',
    portfolioId: portfolio.id,
    name: 'Ancien compte',
    providerId: 'LEGACY',
    kind: Account.KINDS.SECURITIES,
    status: Account.STATUSES.CLOSED,
    currency: 'EUR'
  })
];

function createUseCase({ selectedPortfolio = portfolio, selectedAccounts = accounts } = {}) {
  return new BuildPortfolioOverview({
    portfolioRepository: {
      findById: () => selectedPortfolio
    },
    accountRepository: {
      findByPortfolioId: () => selectedAccounts
    }
  });
}

test('construit une vue consolidée multi-comptes', () => {
  const overview = createUseCase().execute(' portfolio_main ');

  assert.equal(overview.portfolio, portfolio);
  assert.deepEqual(overview.providers, ['REVOLUT', 'TRADE_REPUBLIC']);
  assert.deepEqual(overview.currencies, ['EUR', 'USD']);
  assert.deepEqual(
    overview.accounts.map(account => account.name),
    ['Ancien compte', 'Revolut — Espèces USD', 'Revolut — Titres', 'Trade Republic — CTO']
  );
  assert.deepEqual(
    overview.securitiesAccounts.map(account => account.id),
    ['revolut_stocks', 'trade_republic_cto']
  );
  assert.deepEqual(
    overview.cashAccounts.map(account => account.id),
    ['revolut_cash_usd']
  );
  assert.deepEqual(overview.summary, {
    accountCount: 4,
    activeAccountCount: 3,
    closedAccountCount: 1,
    securitiesAccountCount: 2,
    cashAccountCount: 1,
    providerCount: 2,
    currencyCount: 2
  });
});

test('rend la vue et ses collections immuables', () => {
  const overview = createUseCase().execute(portfolio.id);

  assert.equal(Object.isFrozen(overview), true);
  assert.equal(Object.isFrozen(overview.accounts), true);
  assert.equal(Object.isFrozen(overview.summary), true);
  assert.throws(() => overview.accounts.push(accounts[0]), TypeError);
});

test('refuse un portefeuille introuvable', () => {
  assert.throws(
    () => createUseCase({ selectedPortfolio: null }).execute(portfolio.id),
    /portefeuille .* introuvable/
  );
});

test('refuse un compte rattaché à un autre portefeuille', () => {
  const foreignAccount = new Account({
    id: 'foreign',
    portfolioId: 'portfolio_other',
    name: 'Compte étranger',
    providerId: 'BROKER',
    kind: Account.KINDS.SECURITIES
  });

  assert.throws(
    () => createUseCase({ selectedAccounts: [foreignAccount] }).execute(portfolio.id),
    /n'appartient pas au portefeuille/
  );
});

test('contrôle les contrats des dépôts', () => {
  assert.throws(
    () => new BuildPortfolioOverview({
      portfolioRepository: {},
      accountRepository: { findByPortfolioId() {} }
    }),
    /portfolioRepository doit implémenter/
  );

  assert.throws(
    () => createUseCase({ selectedAccounts: null }).execute(portfolio.id),
    /doit retourner un tableau/
  );

  assert.throws(
    () => createUseCase({ selectedAccounts: [{}] }).execute(portfolio.id),
    /instance de Account/
  );
});
