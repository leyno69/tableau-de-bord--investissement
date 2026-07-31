import test from 'node:test';
import assert from 'node:assert/strict';

import { LeynorAssistantHttpAdapter } from '../../../interfaces/http/LeynorAssistantHttpAdapter.js';

test('returns 503 when the AI provider is disabled', async () => {
  const adapter = new LeynorAssistantHttpAdapter();
  const response = await adapter.handle({ method: 'POST', path: '/leynor/assistant/answer', body: { question: 'Analyse mon portefeuille.' } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'LEYNOR_AI_NOT_CONFIGURED');
});

test('returns the complete assistant result', async () => {
  const expected = Object.freeze({ answer: 'Le ciel est variable.', model: { provider: 'test' } });
  const adapter = new LeynorAssistantHttpAdapter({ assistantService: { async answer(input) { assert.equal(input.question, 'Que vois-tu ?'); return expected; } } });
  const response = await adapter.handle({ method: 'POST', path: '/leynor/assistant/answer', body: { question: 'Que vois-tu ?' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data, expected);
});

test('ignores unrelated routes', async () => {
  const adapter = new LeynorAssistantHttpAdapter();
  assert.equal(await adapter.handle({ method: 'GET', path: '/health' }), null);
});
