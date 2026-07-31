import test from 'node:test';
import assert from 'node:assert/strict';

import { GenerateAutomatedInsights } from '../../application/analysis/GenerateAutomatedInsights.js';

test('détecte concentration, liquidités et qualité de données', () => {
  const result = new GenerateAutomatedInsights().execute({ dashboard: {
    valuation: {
      totalValue: { amount: 1000 }, cashValue: { amount: 300 },
      positions: [{ assetId: 'WORLD', convertedValue: { amount: 500 }, marketData: { status: 'stale' } }, { assetId: 'EM', convertedValue: { amount: 200 } }],
      issues: [{ code: 'PRICE_UNAVAILABLE' }]
    },
    analytics: { maxDrawdown: -0.12 },
    allocation: { categories: [{ label: 'ETF' }] }
  } });
  const codes = result.insights.map(item => item.code);
  assert.ok(codes.includes('CONCENTRATION_CRITICAL'));
  assert.ok(codes.includes('HIGH_CASH'));
  assert.ok(codes.includes('DRAWDOWN_WARNING'));
  assert.ok(codes.includes('STALE_MARKET_DATA'));
  assert.ok(codes.includes('INCOMPLETE_MARKET_DATA'));
  assert.equal(result.dataQuality, 'partial');
  assert.ok(result.confidence < 1);
});

test('ne fabrique pas de signal lorsque les données sont équilibrées et fraîches', () => {
  const result = new GenerateAutomatedInsights().execute({ dashboard: {
    valuation: { totalValue: { amount: 1000 }, cashValue: { amount: 50 }, positions: [
      { assetId: 'A', convertedValue: { amount: 200 } }, { assetId: 'B', convertedValue: { amount: 200 } }, { assetId: 'C', convertedValue: { amount: 200 } }, { assetId: 'D', convertedValue: { amount: 350 } }
    ], issues: [] },
    analytics: { maxDrawdown: -0.03 }, allocation: { categories: [{}, {}] }, marketData: { staleCount: 0, unavailableCount: 0 }
  } });
  assert.equal(result.insights.length, 0);
  assert.equal(result.dataQuality, 'fresh');
  assert.equal(result.confidence, 1);
});
