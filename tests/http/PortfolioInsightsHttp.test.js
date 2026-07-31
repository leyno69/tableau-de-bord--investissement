import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';

function adapter(calls) {
  const facade = {
    async recordTransaction() {}, async savePreferences() {}, async loadPortfolio() { return {}; }, async generateDashboard() { return {}; },
    async analyzeDividends(input) { calls.push(['dividends', input]); return { count: 1, totalNet: 42 }; },
    async buildChartSeries(input) { calls.push(['charts', input]); return { series: { value: [] } }; },
    async simulateInvestment(input) { calls.push(['simulation', input]); return { finalBalance: 1000 }; },
    async evaluateGoal(input) { calls.push(['goal', input]); return { onTrack: true }; }
  };
  return new PortfolioHttpAdapter({ facade });
}

test('expose les dividendes et les séries graphiques d’un portefeuille', async () => {
  const calls = [];
  const http = adapter(calls);
  const dividends = await http.handle({ method: 'GET', path: '/portfolios/p%201/dividends?from=2026-01-01&to=2026-12-31&baseCurrency=USD' });
  const charts = await http.handle({ method: 'GET', path: '/portfolios/p%201/chart-series?from=2026-01-01&to=2026-01-31' });
  assert.equal(dividends.statusCode, 200);
  assert.equal(charts.statusCode, 200);
  assert.deepEqual(calls[0], ['dividends', { portfolioId: 'p 1', from: '2026-01-01', to: '2026-12-31', baseCurrency: 'USD' }]);
  assert.deepEqual(calls[1], ['charts', { portfolioId: 'p 1', from: '2026-01-01', to: '2026-01-31', marketDataPolicy: 'partial' }]);
});

test('expose le simulateur et le suivi d’objectif', async () => {
  const calls = [];
  const http = adapter(calls);
  const simulationInput = { initialCapital: 2000, monthlyContribution: 100, annualReturnRate: 0.07, years: 20 };
  const goalInput = { currentAmount: 10000, targetAmount: 50000, asOfDate: '2026-07-31', targetDate: '2036-07-31' };
  const simulation = await http.handle({ method: 'POST', path: '/simulation/investment', body: simulationInput });
  const goal = await http.handle({ method: 'POST', path: '/goals/evaluate', body: goalInput });
  assert.equal(simulation.statusCode, 200);
  assert.equal(goal.statusCode, 200);
  assert.deepEqual(calls, [['simulation', simulationInput], ['goal', goalInput]]);
});

test('retourne 501 lorsqu’un moteur optionnel est absent', async () => {
  const facade = { async recordTransaction() {}, async savePreferences() {}, async loadPortfolio() { return {}; }, async generateDashboard() { return {}; } };
  const response = await new PortfolioHttpAdapter({ facade }).handle({ method: 'POST', path: '/simulation/investment', body: { years: 10 } });
  assert.equal(response.statusCode, 501);
  assert.equal(response.body.error.code, 'FEATURE_DISABLED');
});
