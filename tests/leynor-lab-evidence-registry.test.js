import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvidenceItem,
  createEvidenceRegistry,
  restoreEvidenceRegistry
} from '../leynor-lab-evidence-registry.js';

function evidence(overrides = {}) {
  return {
    evidenceId: 'evidence-001',
    conclusionId: 'conclusion-objective-stability',
    type: 'independent-simulation',
    direction: 'supportive',
    sourceReference: 'campaign-calibration-a',
    sourceFingerprint: 'fingerprint-a',
    observedAt: '2026-08-02T14:00:00.000Z',
    method: 'Réplication sur une campagne indépendante avec graine distincte.',
    observation: 'La conclusion reste satisfaite dans les hypothèses documentées.',
    independentlyReproduced: true,
    holdoutValidated: true,
    limitations: ['Le résultat reste conditionnel au modèle simulé.'],
    ...overrides
  };
}

test('crée un élément de preuve immuable et traçable', () => {
  const item = createEvidenceItem(evidence());
  assert.equal(item.direction, 'supportive');
  assert.equal(item.independentlyReproduced, true);
  assert.equal(Object.isFrozen(item), true);
  assert.equal(Object.isFrozen(item.limitations), true);
});

test('registre les éléments de manière idempotente et refuse les conflits', () => {
  const registry = createEvidenceRegistry().add(evidence());
  assert.deepEqual(registry.add(evidence()).items, registry.items);

  assert.throws(() => registry.add(evidence({ direction: 'contradictory' })), /Conflit de preuve/);
  assert.throws(() => registry.add(evidence({ evidenceId: 'evidence-002' })), /sourceFingerprint déjà enregistré/);
});

test('résume sans fabriquer de niveau de preuve et conserve les contradictions', () => {
  const registry = createEvidenceRegistry([
    evidence(),
    evidence({
      evidenceId: 'evidence-002',
      type: 'contradiction',
      direction: 'contradictory',
      sourceReference: 'campaign-holdout-b',
      sourceFingerprint: 'fingerprint-b',
      observedAt: '2026-08-03T09:00:00.000Z',
      independentlyReproduced: false,
      holdoutValidated: true,
      observation: 'La conclusion ne se reproduit pas sur le holdout.'
    }),
    evidence({
      evidenceId: 'evidence-003',
      type: 'external-source',
      direction: 'inconclusive',
      sourceReference: 'external-study-c',
      sourceFingerprint: 'fingerprint-c',
      observedAt: '2026-08-04T09:00:00.000Z',
      independentlyReproduced: false,
      holdoutValidated: false,
      observation: 'La source ne permet pas de conclure dans le même périmètre.'
    })
  ]);

  const summary = registry.summarize('conclusion-objective-stability');
  assert.deepEqual(summary.byDirection, {
    supportive: 1,
    contradictory: 1,
    inconclusive: 1
  });
  assert.equal(summary.contradictionsPresent, true);
  assert.equal(summary.independentlyReproducedCount, 1);
  assert.equal(summary.holdoutValidatedCount, 2);
  assert.equal('evidenceLevel' in summary, false);
});

test('filtre par conclusion et ordonne de manière déterministe', () => {
  const first = evidence();
  const second = evidence({
    evidenceId: 'evidence-002',
    conclusionId: 'other-conclusion',
    sourceFingerprint: 'fingerprint-b',
    observedAt: '2026-08-01T14:00:00.000Z'
  });

  const registry = createEvidenceRegistry([first, second]);
  assert.deepEqual(registry.items.map(item => item.evidenceId), ['evidence-002', 'evidence-001']);
  assert.equal(registry.forConclusion('conclusion-objective-stability').length, 1);
});

test('sérialise et restaure de manière déterministe', () => {
  const registry = createEvidenceRegistry([evidence()]);
  const restored = restoreEvidenceRegistry(registry.serialize());
  assert.deepEqual(restored.items, registry.items);
  assert.equal(restored.serialize(), registry.serialize());
  assert.throws(() => restoreEvidenceRegistry('{'), /JSON invalide/);
  assert.throws(
    () => restoreEvidenceRegistry(JSON.stringify({ schemaVersion: 2, items: [] })),
    /incompatible/
  );
});

test('refuse les types et directions inconnus', () => {
  assert.throws(() => createEvidenceItem(evidence({ type: 'opinion' })), /Type de preuve inconnu/);
  assert.throws(() => createEvidenceItem(evidence({ direction: 'positive' })), /Direction de preuve inconnue/);
});
