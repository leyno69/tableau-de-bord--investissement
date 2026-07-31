import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';
import { PortfolioAdminService } from '../../application/admin/PortfolioAdminService.js';

function createFacade() {
  const transactions = [];
  return {
    transactions,
    async recordTransaction(input) { if (!input.id) throw new TypeError('id est obligatoire.'); transactions.push(input); return input; },
    async savePreferences(input) { return input; },
    async loadPortfolio(portfolioId) { return { portfolioId, alerts: [{ id: 'alert-1' }] }; },
    async generateDashboard() { return { performance: { totalReturn: 0.12 } }; }
  };
}

test('crée un portefeuille, un compte puis les liste', async () => {
  const facade = createFacade();
  const adapter = new PortfolioHttpAdapter({ facade, adminService: new PortfolioAdminService({ facade }) });
  const portfolio = await adapter.handle({ method: 'POST', path: '/portfolios', body: { id: 'p-1', name: 'Principal', baseCurrency: 'EUR' } });
  assert.equal(portfolio.statusCode, 201);
  const account = await adapter.handle({ method: 'POST', path: '/portfolios/p-1/accounts', body: { id: 'a-1', name: 'PEA', providerId: 'trade-republic', kind: 'SECURITIES', taxWrapper: 'PEA', currency: 'EUR' } });
  assert.equal(account.statusCode, 201);
  const listed = await adapter.handle({ method: 'GET', path: '/portfolios/p-1/accounts' });
  assert.equal(listed.body.data.length, 1);
});

test('importe un lot avec rapport uniforme des erreurs', async () => {
  const facade = createFacade();
  const adapter = new PortfolioHttpAdapter({ facade, adminService: new PortfolioAdminService({ facade }) });
  await adapter.handle({ method: 'POST', path: '/portfolios', body: { id: 'p-1', name: 'Principal' } });
  const response = await adapter.handle({ method: 'POST', path: '/portfolios/p-1/transactions/import', body: { transactions: [{ id: 'tx-1' }, {}] } });
  assert.equal(response.statusCode, 207);
  assert.equal(response.body.data.imported.length, 1);
  assert.equal(response.body.data.errors[0].index, 1);
});

test('expose les alertes et la performance', async () => {
  const facade = createFacade();
  const adapter = new PortfolioHttpAdapter({ facade });
  const alerts = await adapter.handle({ method: 'GET', path: '/portfolios/p-1/alerts' });
  const performance = await adapter.handle({ method: 'GET', path: '/portfolios/p-1/performance' });
  assert.equal(alerts.body.data[0].id, 'alert-1');
  assert.equal(performance.body.data.totalReturn, 0.12);
});
