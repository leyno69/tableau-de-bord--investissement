import assert from 'node:assert/strict';
import test from 'node:test';

import { LeynorConversationIntentRouter } from '../../application/services/LeynorConversationIntentRouter.js';
import { LeynorAssistantService } from '../../application/services/LeynorAssistantService.js';

const router = new LeynorConversationIntentRouter();

test('les salutations produisent un accueil sans analyse financière', () => {
  const route = router.route({ question: 'Bonjour' });
  assert.equal(route.intent, 'greeting');
  assert.equal(route.mode, 'brief');
  assert.match(route.directAnswer, /Bonjour/);
  assert.match(route.directAnswer, /portefeuille/);
});

test('le routeur distingue simulation, comparaison et pédagogie', () => {
  assert.equal(router.route({ question: 'Simule 200 euros par mois pendant 20 ans' }).intent, 'simulation');
  assert.equal(router.route({ question: 'Compare un ETF World et le S&P 500' }).intent, 'comparison');
  assert.equal(router.route({ question: "Explique comment fonctionne une obligation" }).intent, 'education');
});

test('le niveau expert augmente le budget de réponse', async () => {
  let generationInput;
  const service = new LeynorAssistantService({
    pipeline: { prepare() { return { prompt: { system: 's', user: 'u' }, weather: {}, context: {}, plan: {} }; } },
    languageModelProvider: { async generate(input) { generationInput = input; return { text: 'Analyse', provider: 'fake', model: 'fake', usage: {} }; } }
  });
  const answer = await service.answer({ question: 'Fais un rapport exhaustif de mon portefeuille' });
  assert.equal(answer.responseMode, 'expert');
  assert.equal(generationInput.maxTokens, 1400);
});

test('une salutation ne sollicite jamais le fournisseur de modèle', async () => {
  let called = false;
  const service = new LeynorAssistantService({
    pipeline: { prepare() { throw new Error('ne doit pas être appelé'); } },
    languageModelProvider: { async generate() { called = true; throw new Error('ne doit pas être appelé'); } }
  });
  const answer = await service.answer({ question: 'Salut Leynor' });
  assert.equal(answer.intent, 'greeting');
  assert.equal(called, false);
  assert.equal(answer.model.name, 'deterministic-conversation-router');
});
