import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAssumptionSensitivity } from '../../leynor-lab-assumption-sensitivity.js';

const baseline = {
  scenarioId: 'reference',
  assumptions: {
    annualReturn: 0.05,
    monthlyContribution: 200,
    volatility: 0.15
  },
  metrics: {
    finalValueMedian: 100000,
    goalProbability: 0.60,
    maxDrawdownMedian: 0.20
  }
};

const variants = [
  {
    scenarioId: 'return-low',
    assumptions: { annualReturn: 0.03, monthlyContribution: 200, volatility: 0.15 },
    metrics: { finalValueMedian: 80000, goalProbability: 0.42, maxDrawdownMedian: 0.19 }
  },
  {
    scenarioId: 'return-high',
    assumptions: { annualReturn: 0.07, monthlyContribution: 200, volatility: 0.15 },
    metrics: { finalValueMedian: 124000, goalProbability: 0.76, maxDrawdownMedian: 0.21 }
  },
  {
    scenarioId: 'contribution-high',
    assumptions: { annualReturn: 0.05, monthlyContribution: 300, volatility: 0.15 },
    metrics: { finalValueMedian: 132000, goalProbability: 0.79, maxDrawdownMedian: 0.20 }
  }
];

test('mesure les écarts et élasticités sans fabriquer de score', () => {
  const result = analyzeAssumptionSensitivity({ baseline, variants });
  assert.equal(result.method, 'Analyse de sensibilité un facteur à la fois (OAT).');
  assert.equal(result.experimentCount, 3);
  assert.deepEqual(result.parametersTested, ['annualReturn', 'monthlyContribution']);

  const annualReturn = result.byParameter.find(entry => entry.parameter === 'annualReturn');
  assert.deepEqual(annualReturn.testedValues, [0.03, 0.07]);
  const high = annualReturn.experiments.find(entry => entry.scenarioId === 'return-high');
  assert.equal(high.relativeDelta, 0.4);
  const finalValue = high.metrics.find(entry => entry.metric === 'finalValueMedian');
  assert.equal(finalValue.absoluteDelta, 24000);
  assert.ok(Math.abs(finalValue.relativeDelta - 0.24) < 1e-12);
  assert.ok(Math.abs(finalValue.elasticity - 0.6) < 1e-12);

  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /score de confiance calculé|niveau de preuve calculé|IGL calculé/i);
  assert.match(text, /ne constitue ni un score de confiance/i);
});

test('le résultat est déterministe, immuable et indépendant de l’ordre des variantes', () => {
  const first = analyzeAssumptionSensitivity({ baseline, variants });
  const second = analyzeAssumptionSensitivity({ baseline, variants: [...variants].reverse() });
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.byParameter));
  assert.throws(() => { first.byParameter.push('x'); }, TypeError);
});

test('ne calcule pas une élasticité indéfinie', () => {
  const result = analyzeAssumptionSensitivity({
    baseline: {
      scenarioId: 'zero-reference',
      assumptions: { withdrawal: 0 },
      metrics: { finalValueMedian: 100000 }
    },
    variants: [{
      scenarioId: 'withdrawal-5000',
      assumptions: { withdrawal: 5000 },
      metrics: { finalValueMedian: 94000 }
    }]
  });
  assert.equal(result.byParameter[0].experiments[0].relativeDelta, null);
  assert.equal(result.byParameter[0].experiments[0].metrics[0].elasticity, null);
});

test('refuse les expériences non comparables ou non OAT', () => {
  assert.throws(
    () => analyzeAssumptionSensitivity({
      baseline,
      variants: [{
        scenarioId: 'two-changes',
        assumptions: { annualReturn: 0.07, monthlyContribution: 300, volatility: 0.15 },
        metrics: baseline.metrics
      }]
    }),
    /modifier exactement une hypothèse/
  );

  assert.throws(
    () => analyzeAssumptionSensitivity({
      baseline,
      variants: [{
        scenarioId: 'missing-metric',
        assumptions: { annualReturn: 0.07, monthlyContribution: 200, volatility: 0.15 },
        metrics: { finalValueMedian: 120000 }
      }]
    }),
    /mêmes métriques/
  );

  assert.throws(
    () => analyzeAssumptionSensitivity({ baseline, variants: [] }),
    /au moins une variante/
  );
});
