import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MONTHS,
  createMassSimulationDurationDefinition,
  runMassSimulationDuration
} from '../../leynor-premium-lab.js';

const allocation = [
  { id: 'aggregate', label: 'Agrégé', weight: 1, annualReturn: 0.045, annualVolatility: 0.10 }
];

test('une durée en mois est immuable, bornée et conserve sa durée fractionnaire en années', () => {
  const definition = createMassSimulationDurationDefinition({ portfolioCount: 100, months: 3, initialAmount: 10000, monthlyContribution: 0, annualInflation: 0, annualFees: 0, seed: 7, allocation });
  assert.equal(definition.durationMonths, 3);
  assert.equal(definition.durationYears, 0.25);
  assert.ok(Object.isFrozen(definition));
  assert.throws(() => createMassSimulationDurationDefinition({ months: 0, allocation }), /months/);
  assert.throws(() => createMassSimulationDurationDefinition({ months: MAX_MONTHS + 1, allocation }), /months/);
});

test('la même graine et la même durée produisent exactement le même rapport', () => {
  const input = { portfolioCount: 500, months: 3, initialAmount: 10000, monthlyContribution: 0, annualInflation: 0, annualFees: 0, seed: 20260807, allocation };
  assert.deepEqual(runMassSimulationDuration(input), runMassSimulationDuration(input));
});

test('les contributions sont comptées sur le nombre exact de mois', () => {
  const report = runMassSimulationDuration({ portfolioCount: 100, months: 3, initialAmount: 1000, monthlyContribution: 100, annualInflation: 0, annualFees: 0, seed: 1, allocation });
  assert.equal(report.summary.contributed, 1300);
  assert.equal(report.methodology.durationMonths, 3);
});

test('une durée de 12 mois reproduit exactement la simulation annuelle équivalente dans la logique de durée', async () => {
  const { runMassSimulation } = await import('../../leynor-premium-lab.js');
  const shared = { portfolioCount: 500, initialAmount: 10000, monthlyContribution: 0, annualInflation: 0.02, annualFees: 0.0025, seed: 42, allocation };
  const annual = runMassSimulation({ ...shared, years: 1 });
  const duration = runMassSimulationDuration({ ...shared, months: 12 });
  assert.deepEqual(duration.summary, annual.summary);
});
