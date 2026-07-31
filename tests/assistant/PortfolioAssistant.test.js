import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioAssistant, DeterministicAssistantProvider, InMemoryConversationRepository } from '../../application/assistant/PortfolioAssistant.js';

test('répond avec preuves et sans autoriser d’exécution', async () => {
  let nextId = 0;
  const repository = new InMemoryConversationRepository();
  const assistant = new PortfolioAssistant({
    provider: new DeterministicAssistantProvider(), conversationRepository: repository,
    clock: () => new Date('2026-07-31T06:00:00.000Z'), idGenerator: () => `m-${++nextId}`
  });
  const result = await assistant.ask({
    portfolioId: 'p-1', question: 'Que dois-je examiner en priorité ?',
    dashboard: { valuation: { totalValue: { amount: 1000, currency: 'EUR' } }, marketData: { complete: false } },
    analysis: { insights: [{ code: 'CONCENTRATION_WARNING', message: 'Une position représente 30 %.' }] },
    recommendations: { recommendations: [{ code: 'REVIEW_CONCENTRATION', action: 'Examiner la concentration.' }] },
    profile: { riskProfile: 'balanced', horizonYears: 15 }
  });
  assert.equal(result.executionAllowed, false);
  assert.ok(result.answer.includes('Aucune opération'));
  assert.ok(result.evidenceIds.length > 0);
  assert.equal((await repository.list('p-1')).length, 2);
});

test('filtre les identifiants de preuve inventés par un fournisseur', async () => {
  const assistant = new PortfolioAssistant({
    provider: { async generate() { return { text: 'Réponse', evidenceIds: ['E001', 'E999'] }; } },
    idGenerator: (() => { let value = 0; return () => `m-${++value}`; })()
  });
  const result = await assistant.ask({ portfolioId: 'p-1', question: 'Résumé', dashboard: { valuation: { totalValue: { amount: 10, currency: 'EUR' } } }, analysis: { insights: [] }, recommendations: { recommendations: [] } });
  assert.deepEqual(result.evidenceIds, ['E001']);
});

test('refuse une question vide', async () => {
  const assistant = new PortfolioAssistant();
  await assert.rejects(() => assistant.ask({ portfolioId: 'p-1', question: '  ' }), /question/);
});
