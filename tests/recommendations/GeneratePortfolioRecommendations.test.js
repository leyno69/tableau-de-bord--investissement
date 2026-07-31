import test from 'node:test';
import assert from 'node:assert/strict';

import { GeneratePortfolioRecommendations } from '../../application/recommendations/GeneratePortfolioRecommendations.js';

test('transforme les constats en actions de revue manuelle', () => {
  const result = new GeneratePortfolioRecommendations().execute({
    analysis: { confidence: 0.8, insights: [
      { code: 'CONCENTRATION_CRITICAL', message: 'Une position représente 50 %.' },
      { code: 'STALE_MARKET_DATA', message: 'Une donnée est périmée.' },
      { code: 'HIGH_CASH', message: '30 % de liquidités.' }
    ] },
    profile: { riskProfile: 'conservative', horizonYears: 10, emergencyFundReady: true }
  });
  assert.equal(result.recommendations[0].priority, 'high');
  assert.ok(result.recommendations.some(item => item.code === 'REFRESH_DATA'));
  assert.ok(result.recommendations.every(item => item.execution === 'manual-review-required'));
});

test('priorise l’épargne de précaution et le court terme', () => {
  const result = new GeneratePortfolioRecommendations().execute({
    analysis: { confidence: 1, insights: [] },
    profile: { riskProfile: 'balanced', horizonYears: 2, emergencyFundReady: false }
  });
  const codes = result.recommendations.map(item => item.code);
  assert.ok(codes.includes('BUILD_EMERGENCY_FUND'));
  assert.ok(codes.includes('LIMIT_VOLATILITY'));
});

test('refuse un profil de risque inconnu', () => {
  assert.throws(() => new GeneratePortfolioRecommendations().execute({ analysis: { insights: [] }, profile: { riskProfile: 'casino' } }), /riskProfile/);
});
