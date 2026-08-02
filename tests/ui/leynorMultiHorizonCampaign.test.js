import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SUPPORTED_HORIZONS,
  runMultiHorizonCampaign
} from '../../leynor-multi-horizon-campaign.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const definition = {
  portfolioCount: 40,
  years: 10,
  initialAmount: 5000,
  monthlyContribution: 150,
  annualInflation: 0.02,
  annualFees: 0.002,
  goal: 30000,
  seed: 69,
  allocation
};

test('couvre par défaut 5, 10, 15, 20 et 30 ans', () => {
  const result = runMultiHorizonCampaign({ definition });
  assert.deepEqual(result.horizons, SUPPORTED_HORIZONS);
  assert.equal(result.results.length, 5);
  assert.deepEqual(result.results.map(item => item.years), SUPPORTED_HORIZONS);
});

test('une campagne identique est reproductible et immuable', () => {
  const first = runMultiHorizonCampaign({ definition, horizons: [30, 5, 15] });
  const second = runMultiHorizonCampaign({ definition, horizons: [5, 15, 30] });
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.results));
  assert.ok(first.results.every(Object.isFrozen));
});

test('seule la durée varie entre les scénarios', () => {
  const result = runMultiHorizonCampaign({ definition, horizons: [5, 10] });
  assert.equal(result.results[0].report.definition.seed, definition.seed);
  assert.equal(result.results[1].report.definition.seed, definition.seed);
  assert.equal(result.results[0].report.definition.initialAmount, definition.initialAmount);
  assert.equal(result.results[1].report.definition.initialAmount, definition.initialAmount);
  assert.equal(result.results[0].report.definition.years, 5);
  assert.equal(result.results[1].report.definition.years, 10);
});

test('expose des métriques comparables sans score ni classement', () => {
  const result = runMultiHorizonCampaign({ definition, horizons: [5, 20, 30] });
  assert.ok(result.results.every(item => Number.isFinite(item.metrics.nominalMedian)));
  assert.ok(result.results.every(item => Number.isFinite(item.metrics.drawdownP95)));
  assert.equal(Object.hasOwn(result, 'score'), false);
  assert.equal(Object.hasOwn(result, 'ranking'), false);
  assert.match(result.methodology.interpretation, /ne prédit pas/);
});

test('prend en charge les simulations corrélées', () => {
  const result = runMultiHorizonCampaign({
    type: 'correlated',
    definition: { ...definition, correlationMatrix: [[1, 0.4], [0.4, 1]] },
    horizons: [5, 30]
  });
  assert.equal(result.type, 'correlated');
  assert.equal(result.results.length, 2);
});

test('refuse les horizons invalides, dupliqués ou insuffisants', () => {
  assert.throws(() => runMultiHorizonCampaign({ definition, horizons: [5] }), /entre 2 et 5/);
  assert.throws(() => runMultiHorizonCampaign({ definition, horizons: [5, 7] }), /doit valoir/);
  assert.throws(() => runMultiHorizonCampaign({ definition, horizons: [5, 5] }), /uniques/);
  assert.throws(() => runMultiHorizonCampaign({ definition, horizons: [5, 10, 15, 20, 30, 30] }), /entre 2 et 5/);
});

test('refuse un type inconnu et une définition absente', () => {
  assert.throws(() => runMultiHorizonCampaign({ type: 'magique', definition }), /independent ou correlated/);
  assert.throws(() => runMultiHorizonCampaign({}), /definition/);
});
