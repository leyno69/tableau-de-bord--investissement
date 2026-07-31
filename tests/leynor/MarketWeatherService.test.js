import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketWeatherService } from '../../application/services/MarketWeatherService.js';

const service = new MarketWeatherService();

test('classe un marché solide en ciel dégagé avec des preuves factuelles', () => {
  const report = service.evaluate({
    indexReturnRate: 0.08,
    breadthRate: 0.78,
    volatilityIndex: 13,
    drawdownRate: -0.02,
    trendStrength: 0.8,
    dataQuality: 'complete'
  });

  assert.equal(report.condition, 'clear');
  assert.equal(report.label, 'Ciel dégagé');
  assert.equal(report.confidence, 'high');
  assert.ok(report.score >= 35);
  assert.equal(report.evidence.length, 5);
  assert.equal(report.warnings.length, 0);
  assert.ok(Object.isFrozen(report));
  assert.ok(Object.isFrozen(report.indicators));
});

test('classe un stress extrême en tempête et signale la volatilité', () => {
  const report = service.evaluate({
    indexReturnRate: -0.18,
    breadthRate: 0.18,
    volatilityIndex: 48,
    drawdownRate: -0.28,
    trendStrength: -0.9,
    dataQuality: 'complete'
  });

  assert.equal(report.condition, 'storm');
  assert.equal(report.label, 'Tempête');
  assert.equal(report.confidence, 'high');
  assert.ok(report.score <= -55);
  assert.ok(report.warnings.includes('La volatilité est élevée.'));
});

test('dégrade la confiance et impose une réserve avec des données périmées', () => {
  const report = service.evaluate({
    indexReturnRate: 0.04,
    breadthRate: 0.7,
    volatilityIndex: 16,
    drawdownRate: -0.01,
    trendStrength: 0.5,
    dataQuality: 'stale'
  });

  assert.equal(report.condition, 'uncertain');
  assert.equal(report.confidence, 'low');
  assert.ok(report.warnings.some(warning => warning.includes('périmées')));
});

test('refuse les indicateurs hors limites', () => {
  assert.throws(() => service.evaluate({ breadthRate: 1.2 }), /breadthRate est invalide/);
  assert.throws(() => service.evaluate({ volatilityIndex: -1 }), /volatilityIndex est invalide/);
  assert.throws(() => service.evaluate({ dataQuality: 'unknown' }), /dataQuality est invalide/);
});

test('produit un résultat déterministe pour une entrée identique', () => {
  const input = {
    indexReturnRate: 0.01,
    breadthRate: 0.52,
    volatilityIndex: 22,
    drawdownRate: -0.04,
    trendStrength: 0.1,
    dataQuality: 'complete'
  };

  assert.deepEqual(service.evaluate(input).toJSON(), service.evaluate(input).toJSON());
});
