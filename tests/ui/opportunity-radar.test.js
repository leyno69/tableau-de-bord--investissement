import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpportunityCard, demoOpportunityCards, rankOpportunities } from '../../opportunity-radar.js';

test('opportunity cards are immutable and transparent', () => {
  const card = createOpportunityCard({
    asset: 'ETF Monde', category: 'ETF', thesis: 'Sujet à approfondir.', confidence: 0.62,
    horizon: '1 à 3 mois', favorableEvidence: ['Tendance positive'], counterEvidence: ['Valorisation élevée'],
    risks: ['Correction de marché'], limitations: ['Données partielles'], sources: ['Source déclarée'], freshness: '2026-07-31'
  });
  assert.ok(Object.isFrozen(card));
  assert.ok(Object.isFrozen(card.sources));
  assert.equal(card.confidence, 0.62);
});

test('ranking is deterministic without mutating input', () => {
  const make = (asset, confidence) => createOpportunityCard({
    asset, category: 'Marché', thesis: asset, confidence, horizon: '1 mois', favorableEvidence: [],
    counterEvidence: [], risks: [], limitations: [], sources: ['S'], freshness: 'F'
  });
  const input = [make('B', 0.55), make('A', 0.75)];
  const ranked = rankOpportunities(input);
  assert.deepEqual(input.map(item => item.asset), ['B', 'A']);
  assert.deepEqual(ranked.map(item => item.asset), ['A', 'B']);
  assert.ok(Object.isFrozen(ranked));
});

test('demo cards expose risks, limits and sources', () => {
  assert.ok(demoOpportunityCards.length > 0);
  for (const card of demoOpportunityCards) {
    assert.ok(card.risks.length > 0);
    assert.ok(card.limitations.length > 0);
    assert.ok(card.sources.length > 0);
  }
});
