import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssistantRequest, createConversationMessage } from '../../leynor-conversation.js';

test('crée un message de conversation immuable', () => {
  const message = createConversationMessage({
    role: 'user',
    content: '  Analyse mon portefeuille  ',
    createdAt: '2026-07-31T12:00:00.000Z'
  });

  assert.deepEqual(message, {
    role: 'user',
    content: 'Analyse mon portefeuille',
    createdAt: '2026-07-31T12:00:00.000Z'
  });
  assert.equal(Object.isFrozen(message), true);
});

test('prépare la question et les métriques du portefeuille pour LEYNOR', () => {
  const request = buildAssistantRequest({
    question: 'Suis-je trop concentré ?',
    generatedAt: '2026-07-31T12:00:00.000Z',
    portfolio: {
      cash: 200,
      positions: [
        { name: 'ETF Monde', ticker: 'WPEA', quantity: 10, avgPrice: 50, price: 60, region: 'Monde' },
        { name: 'NVIDIA', ticker: 'NVDA', quantity: 1, avgPrice: 100, price: 150, region: 'États-Unis' }
      ]
    },
    conversation: [
      createConversationMessage({ role: 'user', content: 'Je prépare ma retraite.', createdAt: '2026-07-31T11:59:00.000Z' })
    ]
  });

  assert.match(request.question, /Suis-je trop concentré/);
  assert.match(request.question, /Je prépare ma retraite/);
  assert.equal(request.portfolio.invested, 600);
  assert.equal(request.portfolio.value, 950);
  assert.equal(request.portfolio.cash, 200);
  assert.equal(request.portfolio.performanceRate, 0.25);
  assert.equal(request.portfolio.concentrationRate, 0.8);
  assert.equal(request.portfolio.positions.length, 2);
});

test('refuse une question vide et un rôle inconnu', () => {
  assert.throws(() => buildAssistantRequest({ question: '  ' }), /question/i);
  assert.throws(() => createConversationMessage({ role: 'system', content: 'Test' }), /rôle/i);
});
