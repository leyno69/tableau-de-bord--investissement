import test from 'node:test';
import assert from 'node:assert/strict';

import { MarketWeatherService } from '../../../application/services/MarketWeatherService.js';
import { MarketWeatherHttpAdapter } from '../../../interfaces/http/MarketWeatherHttpAdapter.js';

test('expose une météo de marché déterministe', async () => {
  const adapter = new MarketWeatherHttpAdapter({ marketWeatherService: new MarketWeatherService() });

  const response = await adapter.handle({
    method: 'POST',
    path: '/leynor/market-weather',
    body: {
      indexReturnRate: 0.08,
      breadthRate: 0.72,
      volatilityIndex: 14,
      drawdownRate: -0.02,
      trendStrength: 0.8,
      dataQuality: 'complete'
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.condition, 'clear');
  assert.equal(response.body.data.label, 'Ciel dégagé');
  assert.equal(response.body.data.confidence, 'high');
  assert.ok(response.body.data.evidence.length >= 5);
});

test('retourne null pour une route étrangère', async () => {
  const adapter = new MarketWeatherHttpAdapter({ marketWeatherService: new MarketWeatherService() });
  assert.equal(await adapter.handle({ method: 'GET', path: '/portfolio', body: null }), null);
});

test('retourne une erreur 400 pour des indicateurs invalides', async () => {
  const adapter = new MarketWeatherHttpAdapter({ marketWeatherService: new MarketWeatherService() });
  const response = await adapter.handle({
    method: 'POST',
    path: '/leynor/market-weather',
    body: { breadthRate: 2 }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'INVALID_MARKET_WEATHER_INPUT');
});
