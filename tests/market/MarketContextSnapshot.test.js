import test from 'node:test';
import assert from 'node:assert/strict';

import { createMarketContextSnapshot } from '../../domain/market/MarketContextSnapshot.js';
import { buildMarketContextView } from '../../market-context.js';

test('classifies a stressed market from deterministic thresholds', () => {
  const snapshot = createMarketContextSnapshot({
    indicators: { inflationRate: 5.1, policyRate: 4.5, volatilityIndex: 34, yield10y: 4.8 },
    asOf: '2026-07-31T12:00:00.000Z'
  });

  assert.equal(snapshot.regime, 'stressed');
  assert.equal(snapshot.confidence, 1);
  assert.equal(snapshot.dataQuality, 'complete');
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.indicators));
});

test('classifies a supportive market when inflation, rates and volatility are low', () => {
  const snapshot = createMarketContextSnapshot({
    indicators: { inflationRate: 1.8, policyRate: 1.5, volatilityIndex: 15, yield10y: 2.4 }
  });

  assert.equal(snapshot.regime, 'supportive');
});

test('does not invent missing market data', () => {
  const snapshot = createMarketContextSnapshot({ indicators: { volatilityIndex: 21 } });

  assert.equal(snapshot.regime, 'balanced');
  assert.equal(snapshot.dataQuality, 'insufficient');
  assert.equal(snapshot.indicators.find(item => item.id === 'inflation').value, null);
});

test('builds a French presentation model with explicit confidence', () => {
  const view = buildMarketContextView({
    indicators: { inflationRate: 2.4, policyRate: 3.5 }
  });

  assert.equal(view.regimeLabel, 'Contexte équilibré');
  assert.equal(view.confidenceLabel, '50 % des données disponibles');
  assert.equal(view.indicators[2].displayValue, 'Donnée indisponible');
  assert.ok(Object.isFrozen(view));
});
