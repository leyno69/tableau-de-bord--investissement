import test from 'node:test';
import assert from 'node:assert/strict';
import { createBetaFeedback, summarizeBetaFeedback } from '../../beta-feedback.js';

test('createBetaFeedback validates ratings and required fields', () => {
  const feedback = createBetaFeedback({
    tester: 'Camille', area: 'Simulation', ease: 4, usefulness: 5, confidence: 3,
    category: 'Suggestion', message: 'Ajouter une comparaison de scénarios.', scenario: 'Débutant prudent'
  });
  assert.equal(feedback.area, 'Simulation');
  assert.equal(feedback.usefulness, 5);
  assert.equal(feedback.scenario, 'Débutant prudent');
});

test('summarizeBetaFeedback calculates averages', () => {
  const items = [
    createBetaFeedback({ area: 'Tendances', ease: 4, usefulness: 5, confidence: 3, category: 'Point positif', message: 'Clair.' }),
    createBetaFeedback({ area: 'Simulation', ease: 2, usefulness: 3, confidence: 5, category: 'Suggestion', message: 'Plus de guidage.' })
  ];
  const summary = summarizeBetaFeedback(items);
  assert.deepEqual(summary, { count: 2, ease: 3, usefulness: 4, confidence: 4 });
});
