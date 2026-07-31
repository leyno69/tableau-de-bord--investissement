import test from 'node:test';
import assert from 'node:assert/strict';
import { ScenarioDefinition } from '../../domain/simulation/ScenarioDefinition.js';
import { ScenarioSimulationEngine } from '../../application/services/ScenarioSimulationEngine.js';

const engine = new ScenarioSimulationEngine();

function dca(overrides = {}) {
  return new ScenarioDefinition({
    id: 'dca-world',
    name: 'DCA World',
    strategy: 'DCA',
    initialAmount: 2000,
    monthlyAmount: 100,
    months: 240,
    annualReturn: 0.07,
    annualDividendYield: 0.015,
    annualManagementFee: 0.002,
    transactionFee: 1,
    ...overrides
  });
}

test('scenario definition is immutable and validates strategy inputs', () => {
  const scenario = dca();
  assert.equal(Object.isFrozen(scenario), true);
  assert.throws(() => {
    scenario.months = 12;
  }, TypeError);
  assert.throws(() => new ScenarioDefinition({
    id: 'invalid', name: 'Invalid', strategy: 'LUMP_SUM', initialAmount: 1000, monthlyAmount: 50, months: 12
  }), /LUMP_SUM/);
});

test('same scenario always produces the same immutable result', () => {
  const first = engine.simulate(dca());
  const second = engine.simulate(dca());

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.timeline), true);
  assert.equal(first.timeline.length, 240);
  assert.equal(first.contributed, 26000);
  assert.ok(first.finalValue > first.contributed);
  assert.ok(first.feesPaid > 0);
  assert.ok(first.dividendsPaid > 0);
});

test('non-reinvested dividends remain outside final portfolio value but count in net gain', () => {
  const reinvested = engine.simulate(dca({ id: 'reinvested', reinvestDividends: true }));
  const distributed = engine.simulate(dca({ id: 'distributed', reinvestDividends: false }));

  assert.ok(reinvested.finalValue > distributed.finalValue);
  assert.ok(distributed.dividendsPaid > 0);
  assert.ok(distributed.netGain > distributed.finalValue - distributed.contributed);
});

test('comparison ranks scenarios without mutating definitions', () => {
  const conservative = dca({ id: 'conservative', name: 'Conservateur', annualReturn: 0.03 });
  const dynamic = dca({ id: 'dynamic', name: 'Dynamique', annualReturn: 0.08 });
  const comparison = engine.compare([conservative, dynamic]);

  assert.equal(comparison.leaderScenarioId, 'dynamic');
  assert.ok(comparison.spread > 0);
  assert.equal(Object.isFrozen(comparison.results), true);
  assert.equal(conservative.annualReturn, 0.03);
});

test('transaction fees cannot make an investment negative', () => {
  const result = engine.simulate(new ScenarioDefinition({
    id: 'fees',
    name: 'Frais élevés',
    strategy: 'LUMP_SUM',
    initialAmount: 10,
    months: 1,
    transactionFee: 50
  }));

  assert.equal(result.finalValue, 0);
  assert.equal(result.feesPaid, 10);
  assert.equal(result.netGain, -10);
});
