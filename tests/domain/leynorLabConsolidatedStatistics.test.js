import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateLabStatistics } from '../../leynor-lab-consolidated-statistics.js';

const observations = [
  { seed: 1, finalValue: 100, returnRate: 0.02, volatility: 0.10, maxDrawdown: 0.12, lossFrequency: 0.30, recoveryMonths: 4, goalReached: false, withdrawalImpact: -8 },
  { seed: 2, finalValue: 200, returnRate: 0.05, volatility: 0.14, maxDrawdown: 0.20, lossFrequency: 0.35, recoveryMonths: 8, goalReached: true, withdrawalImpact: -12 },
  { seed: 3, finalValue: 300, returnRate: 0.08, volatility: 0.18, maxDrawdown: 0.28, lossFrequency: 0.40, recoveryMonths: null, goalReached: true, withdrawalImpact: -20 },
  { seed: 3, finalValue: 400, returnRate: 0.11, volatility: 0.22, maxDrawdown: 0.36, lossFrequency: 0.45, recoveryMonths: 16, goalReached: true, withdrawalImpact: -28 }
];

test('agrège les distributions et probabilités sans fabriquer de score', () => {
  const report = aggregateLabStatistics(observations);

  assert.equal(report.observationCount, 4);
  assert.equal(report.seedCount, 3);
  assert.deepEqual(report.seeds, [1, 2, 3]);
  assert.equal(report.finalValue.median, 250);
  assert.equal(report.finalValue.mean, 250);
  assert.equal(report.finalValue.p25, 175);
  assert.equal(report.finalValue.p75, 325);
  assert.equal(report.goalReachedCount, 3);
  assert.equal(report.goalProbability, 0.75);
  assert.equal(report.unrecoveredCount, 1);
  assert.equal(report.unrecoveredRate, 0.25);
  assert.equal(report.recoveryMonths.median, 8);
  assert.equal(report.schemaVersion, 1);
  assert.equal('confidence' in report, false);
  assert.equal('evidence' in report, false);
  assert.equal('igl' in report, false);
});

test('le calcul est déterministe et immuable', () => {
  const first = aggregateLabStatistics(observations);
  const second = aggregateLabStatistics([...observations].reverse());

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.finalValue), true);
  assert.throws(() => { first.seeds.push(99); }, TypeError);
});

test('gère une campagne sans récupération observée', () => {
  const result = aggregateLabStatistics([
    { seed: 10, finalValue: 90, returnRate: -0.02, volatility: 0.20, maxDrawdown: 0.50, lossFrequency: 0.60, recoveryMonths: null, goalReached: false }
  ]);

  assert.equal(result.recoveryMonths, null);
  assert.equal(result.unrecoveredCount, 1);
  assert.equal(result.unrecoveredRate, 1);
  assert.equal(result.finalValue.standardDeviation, 0);
});

test('refuse les observations vides ou incohérentes', () => {
  assert.throws(() => aggregateLabStatistics([]), /au moins une observation/);
  assert.throws(() => aggregateLabStatistics([{ ...observations[0], maxDrawdown: 1.1 }]), /compris entre 0 et 1/);
  assert.throws(() => aggregateLabStatistics([{ ...observations[0], goalReached: 'oui' }]), /booléen/);
  assert.throws(() => aggregateLabStatistics([{ ...observations[0], finalValue: Number.NaN }]), /nombre fini/);
});
