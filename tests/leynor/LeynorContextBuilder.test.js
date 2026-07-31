import test from 'node:test';
import assert from 'node:assert/strict';
import { LeynorContextSnapshot } from '../../domain/leynor/LeynorContextSnapshot.js';
import { LeynorContextBuilder } from '../../application/services/LeynorContextBuilder.js';

test('normalise le contexte utilisateur, portefeuille et marché', () => {
  const snapshot = new LeynorContextBuilder().build({
    user: { expertise: 'expert', objective: ' Retraite ', riskTolerance: 'high' },
    portfolio: { value: '12500.50', currency: 'eur', performanceRate: 0.12, positionCount: 8 },
    market: { uncertainty: 'high', dataQuality: 'partial', asOf: '2026-07-31T10:00:00+02:00' },
    goals: [{ id: 'g1', name: 'Capital', status: 'on-track', progressRate: 0.4, ignored: true }],
    alerts: [{ id: 'a1', type: 'concentration', severity: 'high', message: 'Technologie élevée', ignored: true }],
    generatedAt: '2026-07-31T11:00:00Z'
  });

  assert.ok(snapshot instanceof LeynorContextSnapshot);
  assert.equal(snapshot.user.objective, 'Retraite');
  assert.equal(snapshot.portfolio.value, 12500.5);
  assert.equal(snapshot.portfolio.currency, 'EUR');
  assert.equal(snapshot.market.dataQuality, 'partial');
  assert.equal(snapshot.goals[0].ignored, undefined);
  assert.equal(snapshot.alerts[0].ignored, undefined);
});

test('applique des valeurs prudentes par défaut', () => {
  const snapshot = new LeynorContextBuilder().build({ generatedAt: '2026-07-31T11:00:00Z' });

  assert.equal(snapshot.user.expertise, 'beginner');
  assert.equal(snapshot.user.riskTolerance, 'moderate');
  assert.equal(snapshot.portfolio.currency, 'EUR');
  assert.equal(snapshot.market.uncertainty, 'normal');
  assert.equal(snapshot.market.dataQuality, 'complete');
});

test('produit un instantané immuable', () => {
  const snapshot = new LeynorContextBuilder().build({
    alerts: [{ id: 'a1', message: 'Risque' }],
    generatedAt: '2026-07-31T11:00:00Z'
  });

  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.alerts), true);
  assert.equal(Object.isFrozen(snapshot.alerts[0]), true);
  assert.throws(() => { snapshot.alerts[0].message = 'altéré'; }, TypeError);
});

test('refuse les nombres et dates invalides', () => {
  const builder = new LeynorContextBuilder();
  assert.throws(() => builder.build({ portfolio: { value: 'abc' } }), /valeur numérique/);
  assert.throws(() => builder.build({ market: { asOf: 'demain' } }), /date ISO/);
  assert.throws(() => builder.build({ portfolio: { positionCount: 1.5 } }), /entier positif/);
});
