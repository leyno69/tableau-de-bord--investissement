import test from 'node:test';
import assert from 'node:assert/strict';

import { LeynorAnalysisPipeline } from '../../application/services/LeynorAnalysisPipeline.js';

test('prépare une analyse LEYNOR complète et déterministe', () => {
  const pipeline = new LeynorAnalysisPipeline();
  const input = {
    question: 'Comment interpréter mon portefeuille ?',
    user: { expertise: 'beginner', objective: 'Investir sur 20 ans' },
    portfolio: { value: 12000, currency: 'EUR', performanceRate: 0.06, concentrationRate: 0.45 },
    market: { dataQuality: 'complete', asOf: '2026-07-31T10:00:00.000Z' },
    marketIndicators: {
      indexReturnRate: 0.08,
      breadthRate: 0.72,
      volatilityIndex: 14,
      drawdownRate: -0.02,
      trendStrength: 0.8
    },
    generatedAt: '2026-07-31T10:01:00.000Z'
  };

  const first = pipeline.prepare(input);
  const second = pipeline.prepare(input);

  assert.deepEqual(first, second);
  assert.equal(first.weather.condition, 'clear');
  assert.equal(first.context.market.weather.condition, 'clear');
  assert.equal(first.plan.context.market.weather.label, 'Ciel dégagé');
  assert.match(first.prompt.system, /LEYNOR/);
  assert.match(first.prompt.user, /Ciel dégagé/);
  assert.ok(first.plan.evidence.length >= 5);
});

test('renforce les garde-fous en climat dégradé et face au FOMO', () => {
  const result = new LeynorAnalysisPipeline().prepare({
    question: 'Est-ce que je dois acheter maintenant et faire all-in ?',
    user: { concerned: true },
    portfolio: { performanceRate: -0.25, materialRisk: true },
    marketIndicators: {
      indexReturnRate: -0.12,
      breadthRate: 0.2,
      volatilityIndex: 48,
      drawdownRate: -0.3,
      trendStrength: -0.9,
      dataQuality: 'partial'
    },
    generatedAt: '2026-07-31T10:01:00.000Z'
  });

  assert.equal(result.weather.condition, 'storm');
  assert.equal(result.plan.policy.humorLevel, 'disabled');
  assert.equal(result.plan.policy.riskDisclosure, 'required');
  assert.equal(result.plan.context.market.materialRisk, true);
  assert.ok(result.plan.warnings.some(item => item.includes('données')));
});

test('refuse une question absente', () => {
  assert.throws(() => new LeynorAnalysisPipeline().prepare({}), /question/);
});
