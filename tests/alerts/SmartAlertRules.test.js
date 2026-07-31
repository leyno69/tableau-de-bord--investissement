import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConcentrationAlertRule,
  PriceMoveAlertRule,
  VolatilityAlertRule,
  createDefaultSmartAlertRules
} from '../../domain/alerts/SmartAlertRules.js';

test('concentration rule emits warning and critical events from portfolio weights', () => {
  const rule = new ConcentrationAlertRule({ warningRate: 0.25, criticalRate: 0.50 });
  const events = rule.evaluate({
    positions: [
      { name: 'ETF World', ticker: 'WORLD', quantity: 6, price: 100 },
      { name: 'Nvidia', ticker: 'NVDA', quantity: 4, price: 100 }
    ]
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].severity, 'CRITICAL');
  assert.equal(events[0].context.rate, 0.6);
  assert.equal(events[1].severity, 'WARNING');
  assert.ok(Object.isFrozen(events));
  assert.ok(Object.isFrozen(events[0]));
});

test('price move rule ignores missing and sub-threshold data', () => {
  const rule = new PriceMoveAlertRule();
  const events = rule.evaluate({ positions: [
    { ticker: 'A', changeRate: 0.049 },
    { ticker: 'B' },
    { ticker: 'C', changeRate: -0.08 }
  ] });

  assert.equal(events.length, 1);
  assert.equal(events[0].severity, 'WARNING');
  assert.match(events[0].message, /recule de 8.0 %/);
  assert.match(events[0].fingerprint, /down$/);
});

test('price move rule escalates large moves to critical', () => {
  const rule = new PriceMoveAlertRule({ warningRate: 0.04, criticalRate: 0.09 });
  const [event] = rule.evaluate({ positions: [{ name: 'Tesla', changeRate: 0.12 }] });

  assert.equal(event.severity, 'CRITICAL');
  assert.equal(event.context.changeRate, 0.12);
});

test('volatility rule remains deterministic and does not invent absent metrics', () => {
  const rule = new VolatilityAlertRule();
  assert.deepEqual(rule.evaluate({ positions: [{ ticker: 'WORLD' }] }), []);

  const [event] = rule.evaluate({ positions: [{ ticker: 'NVDA', volatilityRate: 0.44, volatilityWindow: '30d' }] });
  assert.equal(event.severity, 'CRITICAL');
  assert.equal(event.context.window, '30d');
});

test('default factory returns immutable compatible rules', async () => {
  const rules = createDefaultSmartAlertRules();
  assert.equal(rules.length, 3);
  assert.ok(Object.isFrozen(rules));
  for (const rule of rules) {
    assert.equal(typeof rule.id, 'string');
    assert.equal(typeof rule.evaluate, 'function');
    assert.ok(Object.isFrozen(rule));
  }
});

test('invalid threshold ordering is rejected', () => {
  assert.throws(() => new ConcentrationAlertRule({ warningRate: 0.5, criticalRate: 0.4 }), /supérieur/);
  assert.throws(() => new PriceMoveAlertRule({ warningRate: 0 }), /strictement positif/);
});
