import test from 'node:test';
import assert from 'node:assert/strict';

import { createPortfolioApplication } from '../../application/composition/createPortfolioApplication.js';
import { PortfolioApplicationFacade } from '../../application/facades/PortfolioApplicationFacade.js';
import { Transaction } from '../../domain/transaction/Transaction.js';

const providers = {
  marketPriceProvider: { async getPrice() { throw new Error('Aucun actif attendu.'); } },
  exchangeRateProvider: { async getRate() { return 1; } },
  assetClassificationProvider: { async getClassification() { return null; } }
};

test('createPortfolioApplication assemble une façade opérationnelle avec des dépôts mémoire', async () => {
  const application = createPortfolioApplication({
    ...providers,
    clock: () => new Date('2026-07-30T20:00:00.000Z')
  });

  assert.ok(application.facade instanceof PortfolioApplicationFacade);
  assert.ok(Object.isFrozen(application));
  assert.ok(Object.isFrozen(application.repositories));
  assert.ok(Object.isFrozen(application.useCases));

  await application.facade.savePreferences({ portfolioId: 'portfolio-1' });
  const dashboard = await application.facade.generateDashboard({ portfolioId: 'portfolio-1' });

  assert.equal(dashboard.portfolioId, 'portfolio-1');
  assert.equal(dashboard.baseCurrency, 'EUR');
  assert.equal(dashboard.valuation.totalValue.amount, 0);
  assert.equal((await application.repositories.snapshots.listByPortfolio('portfolio-1')).length, 1);
});

test('la composition partage les mêmes dépôts entre commandes et requêtes', async () => {
  const application = createPortfolioApplication(providers);
  const transaction = await application.facade.recordTransaction({
    id: 'deposit-1',
    portfolioId: 'portfolio-1',
    accountId: 'account-1',
    type: Transaction.TYPES.DEPOSIT,
    amount: 500,
    currency: 'EUR',
    executedAt: '2026-07-30',
    createdAt: '2026-07-30T20:00:00.000Z'
  });

  const state = await application.facade.loadPortfolio('portfolio-1');
  assert.equal(state.transactions[0], transaction);
  assert.equal(state.cashBalances[0].balance.amount, 500);
});

test('des dépôts personnalisés peuvent remplacer les adaptateurs mémoire', () => {
  const transactions = { save() {}, findById() {}, listByPortfolio() {} };
  const snapshots = { save() {}, listByPortfolio() {} };
  const alerts = { saveAll() {}, listByPortfolio() {}, listFingerprints() {} };
  const preferences = { save() {}, findByPortfolio() {} };

  const application = createPortfolioApplication({
    ...providers,
    repositories: { transactions, snapshots, alerts, preferences }
  });

  assert.equal(application.repositories.transactions, transactions);
  assert.equal(application.repositories.snapshots, snapshots);
  assert.equal(application.repositories.alerts, alerts);
  assert.equal(application.repositories.preferences, preferences);
});

test('la composition refuse les fournisseurs incompatibles', () => {
  assert.throws(() => createPortfolioApplication({}), /marketPriceProvider/);
  assert.throws(() => createPortfolioApplication({ ...providers, alertRules: null }), /alertRules/);
  assert.throws(() => createPortfolioApplication({ ...providers, idGenerator: 42 }), /idGenerator/);
});
