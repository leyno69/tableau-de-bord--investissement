import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createResilienceDefinition,
  runResilienceSimulation
} from '../../leynor-resilience-lab.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const base = {
  portfolioCount: 80,
  years: 10,
  initialAmount: 5000,
  monthlyContribution: 150,
  annualInflation: 0.02,
  annualFees: 0.002,
  goal: 30000,
  seed: 69,
  allocation
};

test('une même définition produit exactement le même rapport', () => {
  const definition = createResilienceDefinition({
    ...base,
    events: [
      { type: 'contribution_pause', month: 13 },
      { type: 'withdrawal', month: 18, amount: 2000 },
      { type: 'contribution_resume', month: 25 }
    ]
  });
  const first = runResilienceSimulation(definition);
  const second = runResilienceSimulation(definition);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.summary));
});

test('un retrait forcé réduit la médiane et augmente le drawdown', () => {
  const baseline = runResilienceSimulation({ ...base, events: [] });
  const stressed = runResilienceSimulation({
    ...base,
    events: [{ type: 'withdrawal', month: 24, amount: 3000 }]
  });
  assert.ok(stressed.summary.nominal.median < baseline.summary.nominal.median);
  assert.ok(stressed.summary.drawdown.p95 >= baseline.summary.drawdown.p95);
  assert.equal(stressed.summary.plannedWithdrawals, 3000);
});

test('une interruption puis une reprise affectent les contributions', () => {
  const report = runResilienceSimulation({
    ...base,
    events: [
      { type: 'contribution_pause', month: 10 },
      { type: 'contribution_resume', month: 16 }
    ]
  });
  assert.equal(report.summary.pausedMonths, 6);
  assert.match(report.methodology.statement, /mois indiqué/);
  assert.match(report.methodology.limitation, /ne prédisent/);
});

test('refuse les événements et bornes invalides', () => {
  assert.throws(() => createResilienceDefinition({ ...base, events: [{ type: 'magique', month: 1 }] }), /inconnu/);
  assert.throws(() => createResilienceDefinition({ ...base, events: [{ type: 'withdrawal', month: 0, amount: 10 }] }), /month/);
  assert.throws(() => createResilienceDefinition({ ...base, events: [{ type: 'withdrawal', month: 1, amount: -1 }] }), /amount/);
  assert.throws(() => createResilienceDefinition({ ...base, allocation: [{ ...allocation[0], weight: 1.2 }] }), /weight/);
});
