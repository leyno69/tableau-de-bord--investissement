import test from 'node:test';
import assert from 'node:assert/strict';
import { buy, createSimulation, sell, simulateDca, summarizeSimulation } from '../../portfolio-simulator.js';

test('simulation trades remain isolated and update fictive cash', () => {
  const simulation = createSimulation({ initialCash: 1000 });
  buy(simulation, { ticker: 'TEST', name: 'Actif test', amount: 250, price: 25 });
  assert.equal(simulation.cash, 750);
  assert.equal(simulation.positions[0].quantity, 10);
  assert.equal(simulation.isSimulation, true);

  sell(simulation, { ticker: 'TEST', quantity: 4, price: 30 });
  assert.equal(simulation.cash, 870);
  assert.equal(simulation.positions[0].quantity, 6);
  assert.equal(simulation.transactions.length, 2);
});

test('buy rejects an amount above fictive cash', () => {
  const simulation = createSimulation({ initialCash: 100 });
  assert.throws(() => buy(simulation, { ticker: 'TEST', amount: 101, price: 10 }), /insuffisantes/);
});

test('DCA projection reports contributions and theoretical gain', () => {
  const result = simulateDca({ initialAmount: 2000, monthlyAmount: 100, months: 240, annualReturn: 0.07 });
  assert.equal(result.contributed, 26000);
  assert.ok(result.finalValue > result.contributed);
  assert.ok(result.gain > 0);
});

test('summary never mixes real portfolio data', () => {
  const simulation = createSimulation({ initialCash: 5000 });
  const summary = summarizeSimulation(simulation);
  assert.deepEqual(summary, { totalValue: 5000, positionsValue: 0, cash: 5000, pnl: 0, transactionCount: 0 });
});
