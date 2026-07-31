import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContextualQuestion, findMentionedPosition, resolveConversationSubject } from '../../leynor-context.js';
import { buildAssistantRequest } from '../../leynor-conversation.js';

const positions = [
  { name: 'Amundi MSCI World', ticker: 'CW8', isin: 'LU1681043599', quantity: 2, avgPrice: 500, price: 520 },
  { name: 'Nvidia', ticker: 'NVDA', isin: 'US67066G1040', quantity: 1, avgPrice: 120, price: 130 }
];

const conversation = [
  { role: 'user', content: 'Peux-tu analyser Nvidia ?' },
  { role: 'assistant', content: 'Nvidia représente une exposition aux semi-conducteurs.' }
];

test('identifie une position par nom, ticker ou ISIN', () => {
  assert.equal(findMentionedPosition('Que penses-tu de CW8 ?', positions)?.ticker, 'CW8');
  assert.equal(findMentionedPosition('Analyse US67066G1040', positions)?.ticker, 'NVDA');
});

test('résout une référence implicite depuis la conversation récente', () => {
  const subject = resolveConversationSubject({ question: 'Et cette action est-elle trop chère ?', conversation, positions });
  assert.equal(subject.source, 'conversation');
  assert.equal(subject.position.ticker, 'NVDA');
  assert.ok(Object.isFrozen(subject));
});

test('ne fabrique pas de sujet lorsque la question est autonome', () => {
  assert.equal(resolveConversationSubject({ question: 'Quel est le risque global ?', conversation, positions }), null);
});

test('enrichit explicitement la question et la requête assistant', () => {
  assert.match(buildContextualQuestion({ question: 'Et cette action ?', conversation, positions }), /Nvidia \(NVDA\)/);
  const request = buildAssistantRequest({ question: 'Et cette action ?', conversation, portfolio: { positions, cash: 100 } });
  assert.equal(request.conversationContext.resolvedSubject.ticker, 'NVDA');
  assert.equal(request.conversationContext.messageCount, 2);
  assert.match(request.question, /Référence conversationnelle résolue/);
  assert.ok(Object.isFrozen(request.conversationContext));
});
