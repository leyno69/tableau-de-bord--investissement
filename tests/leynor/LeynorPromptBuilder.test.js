import test from 'node:test';
import assert from 'node:assert/strict';
import { LeynorPrompt } from '../../domain/leynor/LeynorPrompt.js';
import { LeynorPromptBuilder } from '../../application/services/LeynorPromptBuilder.js';

const plan = Object.freeze({
  question: 'Cette action va-t-elle exploser ?',
  policy: Object.freeze({
    tone: 'calm',
    humorLevel: 'disabled',
    metaphorLevel: 'light',
    empathyLevel: 'normal',
    explanationDepth: 'detailed',
    jargonLevel: 'simple',
    riskDisclosure: 'required',
    uncertaintyDisclosure: 'required',
    responseStructure: Object.freeze(['introduction', 'facts', 'explanation', 'risks', 'conclusion'])
  }),
  principles: Object.freeze(['Ne jamais créer de FOMO.', 'Distinguer les faits des hypothèses.']),
  context: Object.freeze({ market: Object.freeze({ uncertainty: 'high' }), user: Object.freeze({ expertise: 'beginner' }) }),
  instructions: Object.freeze(['Ne pas utiliser d’humour.', 'Expliquer simplement.']),
  evidence: Object.freeze(['Le titre a progressé de 8 % sur cinq séances.']),
  warnings: Object.freeze(['Les risques matériels doivent être explicités.'])
});

test('construit un prompt LEYNOR indépendant du fournisseur', () => {
  const prompt = new LeynorPromptBuilder().build(plan);

  assert.ok(prompt instanceof LeynorPrompt);
  assert.match(prompt.system, /Tu es LEYNOR/);
  assert.match(prompt.system, /N’invente aucune donnée/);
  assert.match(prompt.system, /ne crée jamais de FOMO/i);
  assert.match(prompt.user, /Cette action va-t-elle exploser/);
  assert.match(prompt.user, /Le titre a progressé de 8 %/);
  assert.equal(prompt.metadata.providerAgnostic, true);
  assert.equal(prompt.metadata.evidenceCount, 1);
  assert.equal(prompt.metadata.warningCount, 1);
});

test('produit des messages immuables compatibles avec un adaptateur conversationnel', () => {
  const prompt = new LeynorPromptBuilder().build(plan);
  const messages = prompt.toMessages();

  assert.deepEqual(messages.map(message => message.role), ['system', 'user']);
  assert.equal(Object.isFrozen(prompt), true);
  assert.equal(Object.isFrozen(messages), true);
  assert.equal(Object.isFrozen(messages[0]), true);
  assert.throws(() => { messages[0].content = 'altéré'; }, TypeError);
});

test('la sérialisation du contexte est déterministe', () => {
  const builder = new LeynorPromptBuilder();
  const first = builder.build({ ...plan, context: { z: 1, a: { y: 2, b: 3 } } });
  const second = builder.build({ ...plan, context: { a: { b: 3, y: 2 }, z: 1 } });

  assert.equal(first.user, second.user);
});

test('refuse un plan incomplet', () => {
  assert.throws(() => new LeynorPromptBuilder().build({ question: 'Bonjour' }), /plan.policy est requis/);
});
