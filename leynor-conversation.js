import { buildContextualQuestion, resolveConversationSubject } from './leynor-context.js';

const DEFAULT_USER = Object.freeze({
  expertise: 'beginner',
  objective: 'Comprendre et piloter son patrimoine sur le long terme'
});

const RESPONSE_RULES = [
  'Réponds d’abord et directement à la dernière question exacte de l’utilisateur.',
  'Ne réutilise jamais une ancienne question comme sujet principal.',
  'Pour une question générale ou personnelle sur LEYNOR, réponds brièvement sans structure financière.',
  'N’invente aucune donnée en temps réel. Signale clairement les données indisponibles.',
  'Ton nom de marque est LEYNOR AI.'
].join(' ');

export function createConversationMessage({ role, content, createdAt = new Date().toISOString() } = {}) {
  if (!['user', 'assistant'].includes(role)) throw new TypeError('Le rôle du message est invalide.');
  const normalizedContent = String(content ?? '').trim();
  if (!normalizedContent) throw new TypeError('Le contenu du message est obligatoire.');
  return Object.freeze({ role, content: normalizedContent, createdAt });
}

export function buildAssistantRequest({ question, portfolio = {}, conversation = [], generatedAt = new Date().toISOString() } = {}) {
  const positions = Array.isArray(portfolio.positions) ? portfolio.positions : [];
  const contextualQuestion = buildContextualQuestion({ question, conversation, positions });
  const subject = resolveConversationSubject({ question, conversation, positions });
  const invested = positions.reduce((sum, position) => sum + Number(position.quantity || 0) * Number(position.avgPrice || 0), 0);
  const positionsValue = positions.reduce((sum, position) => sum + Number(position.quantity || 0) * Number(position.price || 0), 0);
  const cash = Number(portfolio.cash || 0);
  const value = positionsValue + cash;
  const performanceRate = invested > 0 ? (positionsValue - invested) / invested : 0;
  const largestPosition = positions.reduce((largest, position) => {
    const currentValue = Number(position.quantity || 0) * Number(position.price || 0);
    return currentValue > largest ? currentValue : largest;
  }, 0);

  const recentContext = conversation
    .slice(-6)
    .map(message => `${message.role === 'user' ? 'Utilisateur' : 'LEYNOR'} : ${message.content}`)
    .join('\n');

  const prompt = [
    `Instruction prioritaire : ${RESPONSE_RULES}`,
    `Question actuelle : ${contextualQuestion}`,
    recentContext ? `Contexte antérieur uniquement si utile :\n${recentContext}` : ''
  ].filter(Boolean).join('\n\n');

  return Object.freeze({
    question: prompt,
    user: DEFAULT_USER,
    portfolio: Object.freeze({
      value,
      invested,
      cash,
      currency: 'EUR',
      performanceRate,
      concentrationRate: positionsValue > 0 ? largestPosition / positionsValue : 0,
      positions: positions.map(position => Object.freeze({
        name: position.name,
        ticker: position.ticker,
        type: position.type,
        broker: position.broker,
        quantity: Number(position.quantity || 0),
        avgPrice: Number(position.avgPrice || 0),
        price: Number(position.price || 0),
        region: position.region
      }))
    }),
    conversationContext: Object.freeze({
      resolvedSubject: subject ? Object.freeze({
        source: subject.source,
        name: subject.position.name,
        ticker: subject.position.ticker,
        isin: subject.position.isin
      }) : null,
      messageCount: conversation.length
    }),
    market: Object.freeze({ dataQuality: 'partial', asOf: generatedAt }),
    generatedAt
  });
}
