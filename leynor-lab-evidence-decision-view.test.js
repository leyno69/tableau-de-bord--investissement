import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceDecisionView } from './leynor-lab-evidence-decision-view.js';

const classification = {
  recordId: 'classification-1', conclusionId: 'conclusion-1', level: 'moderate',
  rationale: 'Règle calibrée appliquée.', blockers: [], limitations: ['Population étudiée limitée.']
};
const explanation = {
  explanationId: 'explanation-1', conclusionId: 'conclusion-1', summary: 'Conclusion expliquée.',
  evidenceReferences: ['evidence-2', 'evidence-1'], contradictions: ['Signal contradictoire.'],
  risks: ['Risque de régime.'], limitations: ['Historique incomplet.']
};

test('assemble une vue traçable, immuable et sans conseil', () => {
  const view = buildEvidenceDecisionView({ classification, explanation });
  assert.equal(view.evidenceLevel, 'moderate');
  assert.deepEqual(view.evidenceReferences, ['evidence-1', 'evidence-2']);
  assert.equal(view.isActionableInvestmentAdvice, false);
  assert.ok(Object.isFrozen(view));
});

test('explique explicitement un résultat non classé', () => {
  const view = buildEvidenceDecisionView({ classification: { ...classification, level: 'unclassified', blockers: ['missing-rule'] }, explanation });
  assert.match(view.decisionMessage, /ne permettent pas/);
  assert.deepEqual(view.blockers, ['missing-rule']);
});

test('refuse de relier des conclusions différentes', () => {
  assert.throws(() => buildEvidenceDecisionView({ classification, explanation: { ...explanation, conclusionId: 'other' } }), /même conclusion/);
});
