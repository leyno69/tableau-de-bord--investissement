import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';

function adapter(calls) {
  const facade = {
    async recordTransaction() {},
    async savePreferences() {},
    async loadPortfolio() { return {}; },
    async generateDashboard() { return {}; },
    async valuePortfolioAt(input) {
      calls.push(['valuation', input]);
      return { portfolioId: input.portfolioId, date: input.date, totalValue: { amount: 123, currency: 'EUR' } };
    },
    async loadValuationHistory(input) {
      calls.push(['history', input]);
      return [{ portfolioId: input.portfolioId, date: input.from, totalValue: { amount: 100, currency: 'EUR' } }];
    }
  };
  return new PortfolioHttpAdapter({ facade });
}

test('GET /portfolio/valuation transmet les paramètres de requête', async () => {
  const calls = [];
  const response = await adapter(calls).handle({
    method: 'GET',
    path: '/portfolio/valuation?portfolioId=portfolio%201&date=2026-01-04&marketDataPolicy=partial'
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [['valuation', {
    portfolioId: 'portfolio 1',
    date: '2026-01-04',
    marketDataPolicy: 'partial'
  }]]);
  assert.equal(response.body.data.totalValue.amount, 123);
});

test('GET /portfolio/history expose une série quotidienne', async () => {
  const calls = [];
  const response = await adapter(calls).handle({
    method: 'GET',
    path: '/portfolio/history?portfolioId=portfolio-1&from=2026-01-01&to=2026-01-31'
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [['history', {
    portfolioId: 'portfolio-1',
    from: '2026-01-01',
    to: '2026-01-31',
    marketDataPolicy: 'partial'
  }]]);
  assert.equal(response.body.data.length, 1);
});

test('les routes imbriquées restent disponibles', async () => {
  const calls = [];
  await adapter(calls).handle({ method: 'GET', path: '/portfolios/p-1/valuation?date=2026-01-04' });
  await adapter(calls).handle({ method: 'GET', path: '/portfolios/p-1/history?from=2026-01-01&to=2026-01-02' });
  assert.equal(calls[0][1].portfolioId, 'p-1');
  assert.equal(calls[1][1].portfolioId, 'p-1');
});

test('retourne 501 lorsque le moteur historique n’est pas configuré', async () => {
  const facade = {
    async recordTransaction() {}, async savePreferences() {}, async loadPortfolio() {}, async generateDashboard() {}
  };
  const response = await new PortfolioHttpAdapter({ facade }).handle({
    method: 'GET', path: '/portfolio/valuation?portfolioId=p-1&date=2026-01-01'
  });
  assert.equal(response.statusCode, 501);
  assert.equal(response.body.error.code, 'FEATURE_DISABLED');
});
