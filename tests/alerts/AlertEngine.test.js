import test from 'node:test';
import assert from 'node:assert/strict';

import { AlertEvent } from '../../domain/alerts/AlertEvent.js';
import {
  ConcentrationAlertRule,
  DrawdownAlertRule,
  StaleMarketDataAlertRule
} from '../../domain/alerts/PortfolioAlertRules.js';
import { EvaluatePortfolioAlerts } from '../../application/use-cases/EvaluatePortfolioAlerts.js';

test('crée un événement d’alerte immuable', () => {
  const event = new AlertEvent({
    id: 'alert-1', ruleId: 'rule-1', portfolioId: 'portfolio-1',
    type: 'TEST', severity: 'warning', message: 'Alerte',
    triggeredAt: '2026-07-30', fingerprint: 'fp-1', context: { nested: { value: 1 } }
  });

  assert.equal(event.severity, 'WARNING');
  assert.equal(event.triggeredAt, '2026-07-30T00:00:00.000Z');
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.context.nested), true);
});

test('déclenche les alertes de concentration, drawdown et données périmées', async () => {
  const rules = [
    new ConcentrationAlertRule({ threshold: 0.4 }),
    new DrawdownAlertRule({ threshold: 0.2 }),
    new StaleMarketDataAlertRule({
      maxAgeMilliseconds: 60_000,
      now: () => new Date('2026-07-30T12:00:00Z')
    })
  ];

  let id = 0;
  const result = await new EvaluatePortfolioAlerts({
    rules,
    clock: () => new Date('2026-07-30T12:00:00Z'),
    idGenerator: () => `alert-${++id}`
  }).execute({
    portfolioId: 'portfolio-1',
    context: {
      allocation: { holdings: [
        { kind: 'POSITION', assetId: 'WORLD', weight: 0.55 },
        { kind: 'POSITION', assetId: 'BOND', weight: 0.2 }
      ] },
      analytics: { maxDrawdown: {
        rate: -0.25,
        peakAt: '2026-07-01T00:00:00.000Z',
        troughAt: '2026-07-20T00:00:00.000Z'
      } },
      quotes: [{
        assetId: 'WORLD', quotedAt: '2026-07-30T11:00:00.000Z', source: 'TEST'
      }]
    }
  });

  assert.equal(result.events.length, 3);
  assert.deepEqual(result.events.map(event => event.type), [
    'CONCENTRATION', 'DRAWDOWN', 'STALE_MARKET_DATA'
  ]);
  assert.equal(Object.isFrozen(result.events), true);
});

test('déduplique les événements par fingerprint', async () => {
  const rule = new ConcentrationAlertRule({ threshold: 0.4 });
  const engine = new EvaluatePortfolioAlerts({
    rules: [rule],
    clock: () => new Date('2026-07-30T12:00:00Z'),
    idGenerator: () => 'alert-1'
  });

  const context = { allocation: { holdings: [
    { kind: 'POSITION', assetId: 'WORLD', weight: 0.55 }
  ] } };

  const first = await engine.execute({ portfolioId: 'p', context });
  const second = await engine.execute({
    portfolioId: 'p', context, existingFingerprints: first.fingerprints
  });

  assert.equal(first.events.length, 1);
  assert.equal(second.events.length, 0);
});

test('ne déclenche rien sous les seuils et valide les contrats', async () => {
  const result = await new EvaluatePortfolioAlerts({
    rules: [new DrawdownAlertRule({ threshold: 0.3 })]
  }).execute({
    portfolioId: 'p',
    context: { analytics: { maxDrawdown: { rate: -0.1 } } }
  });

  assert.equal(result.events.length, 0);
  assert.throws(() => new ConcentrationAlertRule({ threshold: 2 }), /compris entre 0 et 1/);
  await assert.rejects(
    () => new EvaluatePortfolioAlerts({ rules: [{}] }).execute({ portfolioId: 'p', context: {} }),
    /rule.id/
  );
});
