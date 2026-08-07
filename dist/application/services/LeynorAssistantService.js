import { LeynorConversationIntentRouter } from './LeynorConversationIntentRouter.js';

const TOKEN_LIMITS = Object.freeze({ brief: 180, standard: 700, expert: 1400 });
const GENERAL_CONVERSATION_MAX_TOKENS = 110;
const FRENCH_HEADINGS = Object.freeze({
  introduction: 'Introduction',
  facts: 'Faits',
  fact: 'Fait',
  explanation: 'Explication',
  analysis: 'Analyse',
  risks: 'Risques',
  risk: 'Risque',
  conclusion: 'Conclusion',
  recommendations: 'Recommandations',
  recommendation: 'Recommandation',
  assumptions: 'Hypothèses',
  assumption: 'Hypothèse',
  limitations: 'Limites',
  limitation: 'Limite'
});

function translateHeadings(text) {
  return String(text || '').replace(
    /^(#{1,6}\s*)?(introduction|facts?|explanation|analysis|risks?|conclusion|recommendations?|assumptions?|limitations?)\s*:?[ \t]*$/gim,
    (_, markdown = '', heading) => `${markdown}${FRENCH_HEADINGS[heading.toLowerCase()] || heading}`
  );
}

function conciseGeneralReply(text) {
  const withoutHeadings = translateHeadings(text)
    .replace(/^(#{1,6}\s*)?(Introduction|Faits?|Explication|Analyse|Risques?|Conclusion|Recommandations?|Hypothèses?|Limites?)\s*:?[ \t]*$/gim, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const sentences = withoutHeadings.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return sentences.slice(0, 4).join(' ').trim();
}

function normalizeAnswer(text, intent) {
  if (intent === 'general_conversation' || intent === 'conversation' || intent === 'greeting') {
    return conciseGeneralReply(text);
  }
  return translateHeadings(text).trim();
}

export class LeynorAssistantService {
  constructor({ pipeline, languageModelProvider, intentRouter = new LeynorConversationIntentRouter() } = {}) {
    if (!pipeline || typeof pipeline.prepare !== 'function') throw new TypeError('pipeline doit exposer prepare().');
    if (!languageModelProvider || typeof languageModelProvider.generate !== 'function') throw new TypeError('languageModelProvider doit exposer generate().');
    if (!intentRouter || typeof intentRouter.route !== 'function') throw new TypeError('intentRouter doit exposer route().');
    this.pipeline = pipeline;
    this.languageModelProvider = languageModelProvider;
    this.intentRouter = intentRouter;
    Object.freeze(this);
  }

  async answer(input = {}) {
    const routing = this.intentRouter.route(input);
    if (routing.directAnswer) {
      return Object.freeze({
        answer: normalizeAnswer(routing.directAnswer, routing.intent),
        intent: routing.intent,
        responseMode: routing.mode,
        weather: null,
        context: null,
        plan: null,
        model: Object.freeze({ provider: 'leynor', name: 'deterministic-conversation-router', usage: null })
      });
    }

    const prepared = this.pipeline.prepare({ ...input, conversationIntent: routing.intent, responseMode: routing.mode });
    const completion = await this.languageModelProvider.generate({
      prompt: prepared.prompt,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? (routing.intent === 'general_conversation'
        ? GENERAL_CONVERSATION_MAX_TOKENS
        : TOKEN_LIMITS[routing.mode] ?? TOKEN_LIMITS.standard)
    });
    return Object.freeze({
      answer: normalizeAnswer(completion.text, routing.intent),
      intent: routing.intent,
      responseMode: routing.mode,
      weather: prepared.weather,
      context: prepared.context,
      plan: prepared.plan,
      model: Object.freeze({
        provider: completion.provider,
        name: completion.model,
        usage: completion.usage
      })
    });
  }
}

export { translateHeadings, conciseGeneralReply, normalizeAnswer };
