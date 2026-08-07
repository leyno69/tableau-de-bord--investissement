import { randomUUID } from 'node:crypto';

export class PortfolioAssistant {
  constructor({ provider = new DeterministicAssistantProvider(), conversationRepository = new InMemoryConversationRepository(), clock = () => new Date(), idGenerator = randomUUID } = {}) {
    if (!provider || typeof provider.generate !== 'function') throw new TypeError('provider doit implémenter generate().');
    if (!conversationRepository || typeof conversationRepository.append !== 'function' || typeof conversationRepository.list !== 'function') throw new TypeError('conversationRepository doit implémenter append() et list().');
    if (typeof clock !== 'function' || typeof idGenerator !== 'function') throw new TypeError('clock et idGenerator doivent être des fonctions.');
    this.provider = provider;
    this.conversationRepository = conversationRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async ask({ portfolioId, question, dashboard, analysis, recommendations, profile = {} }) {
    const normalizedPortfolioId = text(portfolioId, 'portfolioId');
    const normalizedQuestion = text(question, 'question');
    const evidence = buildEvidence({ dashboard, analysis, recommendations, profile });
    const history = await this.conversationRepository.list(normalizedPortfolioId, { limit: 12 });
    const request = Object.freeze({
      system: 'Tu es un assistant de revue de portefeuille. Tu expliques les données fournies, cites leurs identifiants de preuve et ne déclenches jamais d’opération. Tu signales toute donnée absente ou périmée.',
      question: normalizedQuestion,
      evidence,
      history: Object.freeze(history.map(item => Object.freeze({ role: item.role, content: item.content }))),
      constraints: Object.freeze({ executionAllowed: false, requireEvidenceReferences: true, financialAdviceBoundary: 'review-and-education' })
    });
    const generated = await this.provider.generate(request);
    const answer = normalizeAnswer(generated, evidence);
    const timestamp = new Date(this.clock()).toISOString();
    const userMessage = Object.freeze({ id: this.idGenerator(), portfolioId: normalizedPortfolioId, role: 'user', content: normalizedQuestion, createdAt: timestamp });
    const assistantMessage = Object.freeze({ id: this.idGenerator(), portfolioId: normalizedPortfolioId, role: 'assistant', content: answer.text, evidenceIds: answer.evidenceIds, createdAt: timestamp });
    await this.conversationRepository.append(userMessage);
    await this.conversationRepository.append(assistantMessage);
    return Object.freeze({ answer: answer.text, evidenceIds: answer.evidenceIds, executionAllowed: false, conversationMessageId: assistantMessage.id });
  }
}

export class DeterministicAssistantProvider {
  async generate({ question, evidence }) {
    const relevant = evidence.filter(item => item.kind === 'recommendation' || item.kind === 'insight').slice(0, 5);
    const lines = relevant.length
      ? relevant.map(item => `- ${item.summary} [${item.id}]`)
      : ['- Aucune analyse ou recommandation exploitable n’est disponible dans le contexte fourni.'];
    return Object.freeze({
      text: `Question : ${question}\n\nÉléments vérifiables :\n${lines.join('\n')}\n\nAucune opération n’a été exécutée.`,
      evidenceIds: relevant.map(item => item.id)
    });
  }
}

export class InMemoryConversationRepository {
  constructor() { this.items = []; }
  async append(message) { this.items.push(Object.freeze(structuredClone(message))); return message; }
  async list(portfolioId, { limit = 20 } = {}) {
    return Object.freeze(this.items.filter(item => item.portfolioId === portfolioId).slice(-limit));
  }
}

function buildEvidence({ dashboard, analysis, recommendations, profile }) {
  const evidence = [];
  const add = (kind, summary, payload) => evidence.push(Object.freeze({ id: `E${String(evidence.length + 1).padStart(3, '0')}`, kind, summary, payload: freeze(payload) }));
  if (dashboard?.valuation) add('valuation', `Valorisation totale : ${moneySummary(dashboard.valuation.totalValue)}.`, dashboard.valuation);
  if (dashboard?.marketData || dashboard?.valuation?.marketData) {
    const market = dashboard.marketData ?? dashboard.valuation.marketData;
    add('market-data', `Qualité des données de marché : ${market.complete === false ? 'partielle' : 'complète'}.`, market);
  }
  for (const insight of analysis?.insights ?? []) add('insight', insight.message ?? insight.code, insight);
  for (const recommendation of recommendations?.recommendations ?? []) add('recommendation', recommendation.action ?? recommendation.code, recommendation);
  add('profile', `Profil déclaré : ${profile.riskProfile ?? 'non renseigné'}, horizon ${profile.horizonYears ?? 'non renseigné'}.`, profile);
  return Object.freeze(evidence);
}

function normalizeAnswer(value, evidence) {
  const textValue = typeof value === 'string' ? value : value?.text;
  const text = typeof textValue === 'string' && textValue.trim() ? textValue.trim() : 'Réponse indisponible.';
  const allowed = new Set(evidence.map(item => item.id));
  const requested = Array.isArray(value?.evidenceIds) ? value.evidenceIds : [];
  const evidenceIds = Object.freeze([...new Set(requested.filter(id => allowed.has(id)))]);
  return Object.freeze({ text, evidenceIds });
}
function moneySummary(value) { if (value && typeof value === 'object' && 'amount' in value) return `${value.amount} ${value.currency ?? ''}`.trim(); return String(value ?? 'indisponible'); }
function text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
function freeze(value) { try { return Object.freeze(structuredClone(value ?? {})); } catch { return Object.freeze({ unavailable: true }); } }
