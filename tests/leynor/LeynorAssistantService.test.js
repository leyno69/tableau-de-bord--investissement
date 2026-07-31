import assert from 'node:assert/strict';
import test from 'node:test';

import { LeynorAssistantService } from '../../application/services/LeynorAssistantService.js';

const prepared = Object.freeze({
  weather: { condition: 'mixed' },
  context: { user: { expertise: 'beginner' } },
  plan: { question: 'Que se passe-t-il ?' },
  prompt: { system: 'system', user: 'user' }
});

test('LeynorAssistantService prépare puis génère une réponse traçable', async () => {
  const calls = [];
  const service = new LeynorAssistantService({
    pipeline: { prepare(input) { calls.push(['prepare', input]); return prepared; } },
    languageModelProvider: {
      async generate(input) {
        calls.push(['generate', input]);
        return { text: 'Le marché reste partagé.', provider: 'fake', model: 'test-model', usage: { totalTokens: 42 } };
      }
    }
  });

  const result = await service.answer({ question: 'Que se passe-t-il ?', temperature: 0.1, maxTokens: 300 });
  assert.equal(result.answer, 'Le marché reste partagé.');
  assert.equal(result.model.provider, 'fake');
  assert.equal(result.model.name, 'test-model');
  assert.equal(result.model.usage.totalTokens, 42);
  assert.deepEqual(calls[1][1], { prompt: prepared.prompt, temperature: 0.1, maxTokens: 300 });
  assert.ok(Object.isFrozen(result));
});

test('LeynorAssistantService valide ses dépendances', () => {
  assert.throws(() => new LeynorAssistantService(), /pipeline/);
  assert.throws(() => new LeynorAssistantService({ pipeline: { prepare() {} } }), /languageModelProvider/);
});
