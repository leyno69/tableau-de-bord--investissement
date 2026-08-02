import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_SEEDS,
  MIN_SEEDS,
  analyzeSeedStability
} from '../../leynor-seed-stability.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const definition = {
  portfolioCount: 40,
  years: 8,
  initialAmount: 3000,
  monthlyContribution: 100,
  annualInflation: 0.02,
  annualFees: 0.002,
  goal: 20000,
  allocation
};

const seeds = [11, 22, 33, 44];

test('une analyse identique produit exactement le même résultat', () => {
  const first = analyzeSeedStability({ definition, seeds });
  const second = analyzeSeedStability({ definition, seeds });
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.reports));
});

test('mesure la dispersion sans fabriquer de score ou de niveau arbitraire', () => {
  const result = analyzeSeedStability({ definition, seeds });
  assert.equal(result.reports.length, seeds.length);
  assert.ok(result.stability.nominalMedian.standardDeviation >= 0);
  assert.ok(result.stability.drawdownP95.coefficientOfVariation >= 0);
  assert.ok(result.stability.goalProbability.standardDeviation >= 0);
  assert.doesNotMatch(JSON.stringify(result), /score|faible|moyen|élevé/i);
  assert.match(result.methodology.interpretation, /pas une certitude/);
});

test('prend en charge les simulations corrélées explicitement', () => {
  const result = analyzeSeedStability({
    type: 'correlated',
    definition: { ...definition, correlationMatrix: [[1, 0.35], [0.35, 1]] },
    seeds
  });
  assert.equal(result.type, 'correlated');
  assert.equal(result.reports.length, seeds.length);
});

test('refuse un échantillon insuffisant, excessif ou dupliqué', () => {
  assert.throws(() => analyzeSeedStability({ definition, seeds: Array(MIN_SEEDS - 1).fill(1) }), /entre/);
  assert.throws(() => analyzeSeedStability({ definition, seeds: Array.from({ length: MAX_SEEDS + 1 }, (_, index) => index) }), /entre/);
  assert.throws(() => analyzeSeedStability({ definition, seeds: [1, 1, 2] }), /uniques/);
});

test('refuse un type inconnu et une définition absente', () => {
  assert.throws(() => analyzeSeedStability({ type: 'magique', definition, seeds }), /independent ou correlated/);
  assert.throws(() => analyzeSeedStability({ seeds }), /definition/);
});
