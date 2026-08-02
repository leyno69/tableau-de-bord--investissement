import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceableExplanation } from '../leynor-lab-explanation-engine.js';

function baseInput() {
  return {
    explanationId: 'explanation-001',
    conclusionId: 'conclusion-goal-probability',
    question: 'Dans quelles conditions la probabilité d’atteindre l’objectif reste-t-elle stable ?',
    conclusion: 'La conclusion reste stable dans le périmètre des campagnes référencées.',
    scope: 'Campagnes indépendantes avec validation hors échantillon.',
    generatedAt: '2026-08-02T14:00:00.000Z',
    engineVersion: '6.0.0',
    references: [
      { type: 'limitation', id: 'limit-001', label: 'Périmètre', summary: 'La conclusion ne couvre pas les hypothèses non testées.' },
      { type: 'campaign', id: 'campaign-001', label: 'Campagne A', summary: 'Campagne indépendante reproductible.' },
      { type: 'criterion', id: 'seed-stability', label: 'Stabilité entre graines', summary: 'Critère calibré et satisfait.' },
      { type: 'evidence', id: 'evidence-001', label: 'Preuve reproduite', summary: 'Résultat reproduit sur plusieurs campagnes.' },
      { type: 'contradiction', id: 'contradiction-001', label: 'Sensibilité', summary: 'La conclusion se dégrade sous certaines hypothèses.' }
    ],
    decisionsNotSupported: [
      'Choisir automatiquement un actif.',
      'Garantir l’atteinte de l’objectif.'
    ]
  };
}

test('construit une explication publiable, immuable et traçable', () => {
  const result = buildTraceableExplanation(baseInput());

  assert.equal(result.isPublishable, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.campaigns.length, 1);
  assert.equal(result.criteria.length, 1);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.contradictions.length, 1);
  assert.equal(result.limitations.length, 1);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.references), true);
});

test('bloque la publication lorsque les références indispensables manquent', () => {
  const input = baseInput();
  input.references = input.references.filter(reference => reference.type !== 'evidence');

  const result = buildTraceableExplanation(input);

  assert.equal(result.isPublishable, false);
  assert.ok(result.blockers.includes('missing-evidence-reference'));
});

test('reste déterministe quel que soit l’ordre des références', () => {
  const input = baseInput();
  const reversed = { ...input, references: [...input.references].reverse() };

  assert.deepEqual(
    buildTraceableExplanation(input),
    buildTraceableExplanation(reversed)
  );
});

test('refuse les références dupliquées et les types inconnus', () => {
  const duplicate = baseInput();
  duplicate.references.push({ ...duplicate.references[0] });
  assert.throws(() => buildTraceableExplanation(duplicate), /référence dupliqué/);

  const unknown = baseInput();
  unknown.references[0] = { ...unknown.references[0], type: 'recommendation' };
  assert.throws(() => buildTraceableExplanation(unknown), /Type de référence inconnu/);
});

test('refuse les explications sans limites décisionnelles explicites', () => {
  const input = baseInput();
  input.decisionsNotSupported = [];

  assert.throws(() => buildTraceableExplanation(input), /decisionsNotSupported/);
});
