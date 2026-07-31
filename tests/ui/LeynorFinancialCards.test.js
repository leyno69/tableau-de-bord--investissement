import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinancialCards, normalizeFinancialCards } from '../../leynor-financial-cards.js';

test('builds deterministic cards from portfolio data', () => {
  const cards = buildFinancialCards({
    cash: 500,
    positions: [
      { quantity: 2, avgPrice: 100, price: 120 },
      { quantity: 1, avgPrice: 200, price: 180 }
    ]
  });

  assert.deepEqual(cards.map(card => card.id), ['value', 'performance', 'cash', 'concentration']);
  assert.equal(cards[1].tone, 'positive');
  assert.equal(cards[3].tone, 'warning');
  assert.ok(Object.isFrozen(cards));
  assert.ok(cards.every(Object.isFrozen));
});

test('returns no cards for an empty portfolio', () => {
  assert.deepEqual(buildFinancialCards({}), []);
});

test('normalizes provider cards without trusting unsupported tones', () => {
  const cards = normalizeFinancialCards([
    { id: 'risk', label: 'Risque', value: 'Élevé', tone: 'danger' },
    { label: 'Confiance', value: 0.72, tone: 'positive' }
  ]);

  assert.equal(cards[0].tone, 'neutral');
  assert.equal(cards[1].value, '0.72');
  assert.ok(Object.isFrozen(cards));
  assert.ok(cards.every(Object.isFrozen));
});
