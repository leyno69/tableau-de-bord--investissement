import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_VARIANTS,
  MIN_VARIANTS,
  analyzeAssumptionSensitivity
} from '../../leynor-assumption-sensitivity.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const definition = {
  portfolioCount: 60,
  years: 10,
  initialAmount: 5000,
  monthlyContribution: 150,
  annualInflation: 0.02,
  annualFees: 0.002,
  goal: 30000,
  seed: 69,
  allocation
};

const variants = [
  { id: 'fees', label: 'Frais plus élevés', changes: { annualFees: 0.01 } },
  { id: 'returns', label: 'Rendements réduits', changes: { returnMultiplier: 0.75 } },
  { id: 'volatility', label: 'Volatilité accrue', changes: { volatilityMultiplier: 1.25 } }
];

test('une analyse identique est reproductible et immuable', () => {
  const first = analyzeAssumptionSensitivity({ definition, variants });
  const second = analyzeAssumptionSensitivity({ definition, variants });
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.results));
  assert.ok(first.results.every(Object.isFrozen));
});

test('mesure les écarts sans classement ni poids IGL', () => {
  const result = analyzeAssumptionSensitivity({ definition, variants });
  assert.equal(result.results.length, variants.length);
  assert.ok(result.results.every(item => Number.isFinite(item.deltas.nominalMedian)));
  assert.ok(result.results.every(item => Number.isFinite(item.deltas.realMedian)));
  assert.equal(Object.hasOwn(result, 'ranking'), false);
  assert.equal(Object.hasOwn(result, 'score'), false);
  assert.equal(Object.hasOwn(result, 'iglWeight'), false);
  assert.match(result.methodology.interpretation, /ni un classement ni une prévision/);
});

test('les hypothèses modifiées influencent réellement le résultat', () => {
  const result = analyzeAssumptionSensitivity({ definition, variants });
  const fees = result.results.find(item => item.id === 'fees');
  const returns = result.results.find(item => item.id === 'returns');
  const volatility = result.results.find(item => item.id === 'volatility');
  assert.notEqual(fees.deltas.nominalMedian, 0);
  assert.ok(returns.deltas.nominalMedian < 0);
  assert.notEqual(volatility.deltas.drawdownP95, 0);
});

test('prend en charge la sensibilité des corrélations', () => {
  const correlated = analyzeAssumptionSensitivity({
    type: 'correlated',
    definition: { ...definition, correlationMatrix: [[1, 0.4], [0.4, 1]] },
    variants: [
      { id: 'lower-correlation', changes: { correlationMultiplier: 0.5 } },
      { id: 'higher-correlation', changes: { correlationMultiplier: 1 } }
    ]
  });
  assert.equal(correlated.type, 'correlated');
  assert.equal(correlated.results.length, 2);
  assert.notEqual(correlated.results[0].deltas.drawdownP95, correlated.results[1].deltas.drawdownP95);
});

test('refuse les variantes invalides et les hypothèses inconnues', () => {
  assert.throws(() => analyzeAssumptionSensitivity({ definition, variants: Array(MIN_VARIANTS - 1).fill(variants[0]) }), /entre/);
  assert.throws(() => analyzeAssumptionSensitivity({
    definition,
    variants: Array.from({ length: MAX_VARIANTS + 1 }, (_, index) => ({ id: `v-${index}`, changes: { annualFees: 0.01 } }))
  }), /entre/);
  assert.throws(() => analyzeAssumptionSensitivity({ definition, variants: [variants[0], { ...variants[1], id: variants[0].id }] }), /dupliqué/);
  assert.throws(() => analyzeAssumptionSensitivity({ definition, variants: [variants[0], { id: 'unknown', changes: { magie: 1 } }] }), /inconnue/);
  assert.throws(() => analyzeAssumptionSensitivity({ definition, variants: [variants[0], { id: 'correlation', changes: { correlationMultiplier: 0.5 } }] }), /corrélée/);
});

test('refuse les bornes incohérentes et les définitions incomplètes', () => {
  assert.throws(() => analyzeAssumptionSensitivity({ definition, variants: [variants[0], { id: 'fees-invalid', changes: { annualFees: 0.5 } }] }), /annualFees/);
  assert.throws(() => analyzeAssumptionSensitivity({ type: 'correlated', definition, variants: [variants[0], variants[1]] }), /correlationMatrix/);
  assert.throws(() => analyzeAssumptionSensitivity({ type: 'magique', definition, variants }), /independent ou correlated/);
  assert.throws(() => analyzeAssumptionSensitivity({ variants }), /definition/);
});
