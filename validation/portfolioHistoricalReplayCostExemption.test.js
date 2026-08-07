import test from 'node:test';
import assert from 'node:assert/strict';
import { runHistoricalReplay } from './portfolioHistoricalReplayEngine.js';

const series = {
  AAA: [
    { date: '2020-01-02', price: 100 },
    { date: '2020-01-03', price: 105 },
    { date: '2020-01-06', price: 110 }
  ],
  CASH: [
    { date: '2020-01-02', price: 1 },
    { date: '2020-01-03', price: 1 },
    { date: '2020-01-06', price: 1 }
  ]
};

test('CASH explicitement exempt ne supporte aucun coût tandis que l’actif risqué en supporte', () => {
  const replay = runHistoricalReplay({
    replayId: 'cash-exemption-fixture',
    initialCash: 1000,
    allocation: [{ ticker: 'AAA', weight: 0.6 }, { ticker: 'CASH', weight: 0.4 }],
    costPolicy: { transactionCostBps: 50, exemptTickers: ['CASH'] },
    seriesByTicker: series,
    startDate: '2020-01-02',
    endDate: '2020-01-06',
    contributions: [],
    rebalanceDates: []
  });
  const cashBuy = replay.eventLog.find(event => event.type === 'BUY' && event.ticker === 'CASH');
  const riskyBuy = replay.eventLog.find(event => event.type === 'BUY' && event.ticker === 'AAA');
  assert.equal(cashBuy.cost, 0);
  assert.ok(riskyBuy.cost > 0);
  assert.ok(replay.totalCosts > 0);
});

test('costPolicy.exemptTickers doit être un tableau', () => {
  assert.throws(() => runHistoricalReplay({
    replayId: 'invalid-cost-exemption-fixture',
    initialCash: 1000,
    allocation: [{ ticker: 'AAA', weight: 0.6 }, { ticker: 'CASH', weight: 0.4 }],
    costPolicy: { transactionCostBps: 50, exemptTickers: 'CASH' },
    seriesByTicker: series,
    startDate: '2020-01-02',
    endDate: '2020-01-06',
    contributions: [],
    rebalanceDates: []
  }), /exemptTickers doit être un tableau/);
});