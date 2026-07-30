import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioApplicationFacade } from '../../application/facades/PortfolioApplicationFacade.js';
import { AddTransaction } from '../../application/use-cases/AddTransaction.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import {
  InMemoryTransactionRepository,
  InMemoryPortfolioSnapshotRepository,
  InMemoryAlertEventRepository,
  InMemoryPortfolioPreferencesRepository
} from '../../infrastructure/persistence/InMemoryRepositories.js';

const transactionProperties = {
  id: 'buy-1',
  portfolioId: 'portfolio-1',
  accountId: 'account-1',
  assetId: 'asset-1',
  type: Transaction.TYPES.BUY,
  quantity: 2,
  unitPrice: 100,
  currency: 'EUR',
  executedAt: '2026-01-02T10:00:00Z',
  createdAt: '2026-01-02T10:00:00Z'
};

function createFixture() {
  const transactionRepository = new InMemoryTransactionRepository();
  const snapshotRepository = new InMemoryPortfolioSnapshotRepository();
  const alertRepository = new InMemoryAlertEventRepository();
  const preferencesRepository = new InMemoryPortfolioPreferencesRepository();
  const dashboardCalls = [];
  const persisted = [];

  const facade = new PortfolioApplicationFacade({
    addTransaction: new AddTransaction({ transactionRepository }),
    transactionRepository,
    snapshotRepository,
    alertRepository,
    preferencesRepository,
    buildDashboard: {
      async execute(input) {
        dashboardCalls.push(input);
        return Object.freeze({
          portfolioId: input.portfolioId,
          currentSnapshot: { portfolioId: input.portfolioId },
          alerts: { events: [] }
        });
      }
    },
    persistDashboardState: {
      async execute(dashboard) {
        persisted.push(dashboard);
        return dashboard;
      }
    }
  });

  return { facade, transactionRepository, preferencesRepository, dashboardCalls, persisted };
}

test('enregistre une transaction et reconstruit positions et espèces', async () => {
  const { facade } = createFixture();
  await facade.recordTransaction(transactionProperties);

  const state = await facade.loadPortfolio('portfolio-1');

  assert.equal(state.transactions.length, 1);
  assert.equal(state.positions.length, 1);
  assert.equal(state.positions[0].assetId, 'asset-1');
  assert.equal(state.positions[0].quantity, 2);
  assert.equal(state.cashBalances.length, 1);
  assert.equal(state.cashBalances[0].balance.amount, -200);
  assert.equal(Object.isFrozen(state), true);
});

test('enregistre les préférences et génère une vue depuis les dépôts', async () => {
  const { facade, dashboardCalls, persisted } = createFixture();
  await facade.recordTransaction(transactionProperties);
  const preferences = await facade.savePreferences({
    portfolioId: 'portfolio-1',
    baseCurrency: 'usd',
    periodsPerYear: 365
  });

  const result = await facade.generateDashboard({
    portfolioId: 'portfolio-1',
    marketQuotes: [{ assetId: 'asset-1' }]
  });

  assert.ok(preferences instanceof PortfolioPreferences);
  assert.equal(dashboardCalls.length, 1);
  assert.equal(dashboardCalls[0].baseCurrency, 'USD');
  assert.equal(dashboardCalls[0].periodsPerYear, 365);
  assert.equal(dashboardCalls[0].positions[0].quantity, 2);
  assert.deepEqual(dashboardCalls[0].marketQuotes, [{ assetId: 'asset-1' }]);
  assert.equal(persisted[0], result);
});

test('refuse de générer un tableau de bord sans préférences', async () => {
  const { facade } = createFixture();

  await assert.rejects(
    () => facade.generateDashboard({ portfolioId: 'portfolio-1' }),
    /Aucune préférence/
  );
});

test('valide les contrats injectés et les entrées publiques', async () => {
  const { facade } = createFixture();

  await assert.rejects(
    () => facade.generateDashboard({ portfolioId: 'portfolio-1', marketQuotes: {} }),
    /tableau/
  );

  assert.throws(
    () => new PortfolioApplicationFacade({}),
    /addTransaction/
  );
});
