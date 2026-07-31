import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PORTFOLIOS,
  buildLeynorLabInterpretation,
  createMassSimulationDefinition,
  runMassSimulation
} from '../../leynor-premium-lab.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

test('la définition massive est immuable et bornée', () => {
  const definition = createMassSimulationDefinition({ portfolioCount: 1000, years: 20, initialAmount: 2000, monthlyContribution: 100, goal: 100000, seed: 69, allocation });
  assert.equal(definition.portfolioCount, 1000);
  assert.equal(definition.years, 20);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.allocation));
  assert.throws(() => createMassSimulationDefinition({ portfolioCount: MAX_PORTFOLIOS + 1, years: 20, allocation }), /portfolioCount/);
  assert.throws(() => createMassSimulationDefinition({ portfolioCount: 10, years: 20, allocation: [{ ...allocation[0], weight: 0.9 }] }), /pondérations/);
});

test('une même graine produit exactement le même rapport', () => {
  const input = { portfolioCount: 250, years: 15, initialAmount: 5000, monthlyContribution: 150, annualInflation: 0.02, annualFees: 0.003, goal: 80000, seed: 12345, allocation };
  assert.deepEqual(runMassSimulation(input), runMassSimulation(input));
});

test('le rapport agrège les percentiles, le risque et la probabilité d’objectif', () => {
  const report = runMassSimulation({ portfolioCount: 500, years: 20, initialAmount: 3000, monthlyContribution: 100, annualInflation: 0.02, annualFees: 0.0025, goal: 100000, seed: 42, allocation });
  assert.equal(report.summary.portfolioCount, 500);
  assert.equal(report.summary.contributed, 27000);
  assert.ok(report.summary.nominal.minimum <= report.summary.nominal.p05);
  assert.ok(report.summary.nominal.p05 <= report.summary.nominal.median);
  assert.ok(report.summary.nominal.median <= report.summary.nominal.p95);
  assert.ok(report.summary.nominal.p95 <= report.summary.nominal.maximum);
  assert.ok(report.summary.realMedian < report.summary.nominal.median);
  assert.ok(report.summary.goalProbability >= 0 && report.summary.goalProbability <= 1);
  assert.match(report.methodology.interpretationWarning, /ne prédisent pas/);
});

test('LEYNOR transforme le rapport en observations et limites explicites', () => {
  const report = runMassSimulation({ portfolioCount: 100, years: 10, initialAmount: 10000, monthlyContribution: 200, goal: 50000, seed: 7, allocation });
  const interpretation = buildLeynorLabInterpretation(report);
  assert.match(interpretation.title, /Laboratoire Premium/);
  assert.ok(interpretation.observations.some(item => item.includes('probabilité simulée')));
  assert.ok(interpretation.limits.some(item => item.includes('ne prédisent pas')));
  assert.equal(interpretation.nextTests.length, 3);
  assert.ok(Object.isFrozen(interpretation));
});
