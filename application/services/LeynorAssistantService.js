import { LeynorConversationIntentRouter } from './LeynorConversationIntentRouter.js';

const TOKEN_LIMITS = Object.freeze({ brief: 180, standard: 700, expert: 1400 });

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
        answer: routing.directAnswer,
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
      maxTokens: input.maxTokens ?? TOKEN_LIMITS[routing.mode] ?? TOKEN_LIMITS.standard
    });
    return Object.freeze({
      answer: completion.text,
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
