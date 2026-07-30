import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';

function createFacade(overrides = {}) {
  return {
    async recordTransaction(value) { return Object.freeze({ ...value, saved: true }); },
    async savePreferences(value) { return Object.freeze({ ...value, saved: true }); },
    async loadPortfolio(portfolioId) { return Object.freeze({ portfolioId, transactions: [] }); },
    async generateDashboard({ portfolioId, marketQuotes }) {
      return Object.freeze({ portfolioId, marketQuotes, total: { amount: 100, currency: 'EUR' } });
    },
    ...overrides
  };
}

test('POST transaction impose le portfolioId de la route et retourne 201', async () => {
  const adapter = new PortfolioHttpAdapter({ facade: createFacade() });
  const response = await adapter.handle({
    method: 'post',
    path: '/portfolios/portfolio-1/transactions',
    body: { id: 'tx-1', portfolioId: 'forged' }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.portfolioId, 'portfolio-1');
  assert.equal(response.body.data.id, 'tx-1');
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
});

test('PUT préférences et GET portefeuille utilisent la façade', async () => {
  const adapter = new PortfolioHttpAdapter({ facade: createFacade() });
  const saved = await adapter.handle({
    method: 'PUT',
    path: '/portfolios/p-1/preferences',
    body: { baseCurrency: 'EUR' }
  });
  const loaded = await adapter.handle({ method: 'GET', path: '/portfolios/p-1' });

  assert.equal(saved.statusCode, 200);
  assert.equal(saved.body.data.portfolioId, 'p-1');
  assert.deepEqual(loaded.body.data, { portfolioId: 'p-1', transactions: [] });
});

test('POST dashboard transmet les cotations', async () => {
  const adapter = new PortfolioHttpAdapter({ facade: createFacade() });
  const marketQuotes = [{ assetId: 'asset-1', price: 10 }];
  const response = await adapter.handle({
    method: 'POST',
    path: '/portfolios/p-1/dashboard?refresh=true',
    body: { marketQuotes }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.marketQuotes, marketQuotes);
});

test('les erreurs de validation, conflit, absence et erreur interne sont traduites', async () => {
  const invalid = new PortfolioHttpAdapter({ facade: createFacade() });
  assert.equal((await invalid.handle({ method: 'POST', path: '/portfolios/p/transactions', body: null })).statusCode, 400);

  const conflict = new PortfolioHttpAdapter({ facade: createFacade({
    async recordTransaction() { throw new Error('Une transaction existe déjà.'); }
  }) });
  assert.equal((await conflict.handle({ method: 'POST', path: '/portfolios/p/transactions', body: {} })).statusCode, 409);

  const missing = new PortfolioHttpAdapter({ facade: createFacade({
    async generateDashboard() { throw new Error('Aucune préférence n\'est configurée.'); }
  }) });
  assert.equal((await missing.handle({ method: 'POST', path: '/portfolios/p/dashboard', body: {} })).statusCode, 404);

  const broken = new PortfolioHttpAdapter({ facade: createFacade({
    async loadPortfolio() { throw new Error('secret database detail'); }
  }) });
  const response = await broken.handle({ method: 'GET', path: '/portfolios/p' });
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.message, 'Une erreur interne est survenue.');
});

test('une route inconnue retourne 404 sans appeler la façade', async () => {
  const adapter = new PortfolioHttpAdapter({ facade: createFacade() });
  const response = await adapter.handle({ method: 'DELETE', path: '/unknown' });
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});

test('le constructeur valide le contrat de façade', () => {
  assert.throws(() => new PortfolioHttpAdapter({ facade: {} }), /recordTransaction/);
});
