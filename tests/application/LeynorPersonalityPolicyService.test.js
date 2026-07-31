import test from 'node:test';
import assert from 'node:assert/strict';
import { LeynorPersonalityPolicyService } from '../../application/services/LeynorPersonalityPolicyService.js';

const service = new LeynorPersonalityPolicyService();

test('désactive l’humour et renforce l’empathie face à une perte importante', () => {
  const policy = service.createPolicy({ lossRate: -0.35, expertise: 'beginner' });

  assert.equal(policy.humorLevel, 'disabled');
  assert.equal(policy.empathyLevel, 'high');
  assert.equal(policy.tone, 'reassuring');
  assert.equal(policy.riskDisclosure, 'required');
  assert.equal(policy.explanationDepth, 'detailed');
});

test('rend les incertitudes obligatoires lorsque les données sont partielles', () => {
  const policy = service.createPolicy({ dataQuality: 'partial' });

  assert.equal(policy.uncertaintyDisclosure, 'required');
  assert.equal(policy.humorLevel, 'disabled');
  assert.equal(policy.metaphorLevel, 'light');
});

test('refuse le ton promotionnel pour une question génératrice de FOMO', () => {
  const policy = service.createPolicy({ fomoPrompt: true, gainRate: 0.5 });

  assert.equal(policy.humorLevel, 'disabled');
  assert.equal(policy.riskDisclosure, 'required');
  assert.equal(policy.explanationDepth, 'detailed');
});

test('adapte le niveau technique sans changer les principes de réponse', () => {
  const policy = service.createPolicy({ expertise: 'expert' });

  assert.equal(policy.jargonLevel, 'technical');
  assert.equal(policy.explanationDepth, 'concise');
  assert.deepEqual(policy.responseStructure, ['introduction', 'facts', 'explanation', 'risks', 'conclusion']);
});

test('produit une politique et une structure immuables', () => {
  const policy = service.createPolicy();

  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.responseStructure), true);
  assert.throws(() => policy.responseStructure.push('promotion'));
});

test('rejette les entrées incohérentes', () => {
  assert.throws(() => service.createPolicy({ expertise: 'legend' }), /expertise est invalide/);
  assert.throws(() => service.createPolicy({ lossRate: Number.NaN }), /lossRate est invalide/);
});
