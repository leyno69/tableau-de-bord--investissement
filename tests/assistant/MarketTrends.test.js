import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrendSignal, rankMarketNews, scoreMarketNews } from '../../market-trends.js';

test('a trend signal carries its complete evidence assessment', () => {
  const signal = createTrendSignal({
    asset: 'ETF Monde', direction: 'hausse', probability: .62, horizon: '3 mois',
    method: 'Momentum et largeur de marché', evidence: ['Momentum positif'],
    assumptions: ['Contexte macro stable'], limitations: ['Historique limité'],
    freshness: 'Aujourd’hui', counterEvidence: ['Valorisation élevée']
  });
  assert.equal(signal.probability, .62);
  assert.deepEqual(signal.forecast.evidence, ['Momentum positif']);
  assert.deepEqual(signal.forecast.counterEvidence, ['Valorisation élevée']);
});

test('market news scoring is bounded and ranking is descending', () => {
  assert.equal(scoreMarketNews({ impact: 2, relevance: 2, reliability: 2, recency: 2, marketBreadth: 2 }), 100);
  const ranked = rankMarketNews([
    { title: 'faible', impact: .1, relevance: .1, reliability: .1, recency: .1, marketBreadth: .1 },
    { title: 'fort', impact: .9, relevance: .9, reliability: .9, recency: .9, marketBreadth: .9 }
  ]);
  assert.equal(ranked[0].title, 'fort');
  assert.ok(ranked[0].importanceScore > ranked[1].importanceScore);
});
