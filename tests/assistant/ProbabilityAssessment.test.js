import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbabilityAssessment, probabilityLabel } from '../../probability-assessment.js';

test('une probabilité exige des preuves, une méthode, des hypothèses et des limites', () => {
  const assessment = createProbabilityAssessment({
    probability: 0.64,
    event: 'Le cours atteint la zone cible',
    horizon: '30 jours',
    method: 'Fréquence historique conditionnelle sur volatilité et tendance comparables',
    evidence: ['42 observations historiques comparables', 'Volatilité actuelle de 18 %'],
    assumptions: ['Absence de choc macroéconomique majeur'],
    limitations: ['Échantillon historique limité', 'Les performances passées ne préjugent pas des résultats futurs'],
    counterEvidence: ['Momentum hebdomadaire en ralentissement'],
    dataFreshness: 'Cours au 31 juillet 2026'
  });

  assert.equal(assessment.probability, 0.64);
  assert.equal(assessment.evidence.length, 2);
  assert.equal(assessment.counterEvidence.length, 1);
  assert.equal(probabilityLabel(assessment.probability), '64 %');
});

test('une probabilité non justifiée est refusée', () => {
  assert.throws(() => createProbabilityAssessment({
    probability: 0.8,
    event: 'Hausse du titre',
    horizon: '7 jours',
    method: 'intuition',
    evidence: [],
    assumptions: ['Marché stable'],
    limitations: ['Incertitude élevée']
  }), /evidence/);
});

test('une valeur hors de zéro à un est refusée', () => {
  assert.throws(() => createProbabilityAssessment({
    probability: 85,
    event: 'Hausse du titre',
    horizon: '7 jours',
    method: 'modèle statistique',
    evidence: ['Données de marché'],
    assumptions: ['Marché ouvert'],
    limitations: ['Modèle simplifié']
  }), /comprise entre 0 et 1/);
});
