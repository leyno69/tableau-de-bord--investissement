import test from 'node:test';
import assert from 'node:assert/strict';

import { LeynorAnalysisHttpAdapter } from '../../../interfaces/http/LeynorAnalysisHttpAdapter.js';

test('expose la préparation d’analyse LEYNOR', async () => {
  const calls = [];
  const adapter = new LeynorAnalysisHttpAdapter({
    pipeline: {
      prepare(input) {
        calls.push(input);
        return { prompt: { system: 'system', user: 'user' } };
      }
    }
  });

  const response = await adapter.handle({
    method: 'POST',
    path: '/leynor/analysis/prepare',
    body: { question: 'Analyse mon portefeuille' }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data, { prompt: { system: 'system', user: 'user' } });
  assert.equal(calls[0].question, 'Analyse mon portefeuille');
});

test('ignore les autres routes', async () => {
  const adapter = new LeynorAnalysisHttpAdapter({ pipeline: { prepare() {} } });
  assert.equal(await adapter.handle({ method: 'GET', path: '/health' }), null);
});

test('retourne 400 lorsque le pipeline refuse la requête', async () => {
  const adapter = new LeynorAnalysisHttpAdapter({
    pipeline: { prepare() { throw new TypeError('question doit être une chaîne non vide.'); } }
  });
  const response = await adapter.handle({ method: 'POST', path: '/leynor/analysis/prepare', body: {} });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'INVALID_LEYNOR_ANALYSIS_REQUEST');
});
