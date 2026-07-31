import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolioInsight } from '../../portfolio-assistant.js';

const portfolio = {
  cash: 500,
  positions: [
    { quantity: 10, avgPrice: 90, price: 100, region: 'Monde' },
    { quantity: 1, avgPrice: 100, price: 100, region: 'Europe' }
  ]
};

test('retourne une analyse structurée avec confiance et actions', () => {
  const result = buildPortfolioInsight('Analyse la concentration', portfolio);
  assert.equal(typeof result.text, 'string');
  assert.equal(result.severity, 'warning');
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
  assert.ok(result.actions.length > 0);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.actions));
});

test('signale les liquidités disponibles avec des actions', () => {
  const result = buildPortfolioInsight('Que puis-je acheter avec mes liquidités ?', portfolio);
  assert.match(result.text, /500/);
  assert.equal(result.severity, 'info');
  assert.ok(result.actions.some(action => action.includes('progressif')));
});

test('signale un portefeuille vide comme avertissement', () => {
  const result = buildPortfolioInsight('Fais le bilan', { cash: 0, positions: [] });
  assert.equal(result.severity, 'warning');
  assert.equal(result.confidence, 1);
});
