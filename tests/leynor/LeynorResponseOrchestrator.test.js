import test from 'node:test';
import assert from 'node:assert/strict';
import { LeynorPersonalityPolicyService } from '../../application/services/LeynorPersonalityPolicyService.js';
import { LeynorResponseOrchestrator } from '../../application/services/LeynorResponseOrchestrator.js';

function createOrchestrator() {
  return new LeynorResponseOrchestrator({ personalityPolicyService: new LeynorPersonalityPolicyService() });
}

test('prépare un plan immuable et indépendant du fournisseur IA', () => {
  const plan = createOrchestrator().prepare({
    question: 'Pourquoi mon portefeuille baisse-t-il ?',
    user: { expertise: 'beginner', objective: 'Investir sur vingt ans' },
    portfolio: { value: 12000, currency: 'eur', lossRate: -0.08 },
    market: { uncertainty: 'normal', dataQuality: 'complete' },
    evidence: ['Le portefeuille recule de 8 % sur la période.']
  });

  assert.equal(plan.context.portfolio.currency, 'EUR');
  assert.equal(plan.policy.jargonLevel, 'simple');
  assert.equal(plan.policy.explanationDepth, 'detailed');
  assert.equal(plan.evidence.length, 1);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.policy));
  assert.ok(Object.isFrozen(plan.context));
  assert.throws(() => { plan.question = 'modifiée'; }, TypeError);
});

test('désactive humour et exige les risques face à une perte importante', () => {
  const plan = createOrchestrator().prepare({
    question: 'Est-ce grave ?',
    user: { concerned: true },
    portfolio: { lossRate: -0.35, materialRisk: true },
    market: { uncertainty: 'high', dataQuality: 'partial' }
  });

  assert.equal(plan.policy.tone, 'reassuring');
  assert.equal(plan.policy.humorLevel, 'disabled');
  assert.equal(plan.policy.empathyLevel, 'high');
  assert.equal(plan.policy.riskDisclosure, 'required');
  assert.equal(plan.policy.uncertaintyDisclosure, 'required');
  assert.ok(plan.warnings.some(warning => warning.includes('incomplètes')));
});

test('détecte une formulation FOMO sans déléguer la décision au modèle', () => {
  const plan = createOrchestrator().prepare({
    question: 'Cette action va exploser, je dois acheter maintenant ?',
    user: { expertise: 'intermediate' },
    portfolio: {},
    market: {}
  });

  assert.equal(plan.policy.humorLevel, 'disabled');
  assert.equal(plan.policy.riskDisclosure, 'required');
  assert.ok(plan.principles.some(principle => principle.includes('FOMO')));
});

test('autorise un style plus technique et concis pour un expert', () => {
  const plan = createOrchestrator().prepare({
    question: 'Analyse la concentration factorielle du portefeuille.',
    user: { expertise: 'expert' },
    portfolio: { concentrationRate: 0.42 },
    market: { uncertainty: 'low' }
  });

  assert.equal(plan.policy.jargonLevel, 'technical');
  assert.equal(plan.policy.explanationDepth, 'concise');
  assert.equal(plan.policy.humorLevel, 'light');
});

test('refuse une dépendance de politique invalide', () => {
  assert.throws(() => new LeynorResponseOrchestrator(), /createPolicy/);
});
