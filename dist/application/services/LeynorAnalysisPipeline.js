import { LeynorContextBuilder } from './LeynorContextBuilder.js';
import { LeynorPersonalityPolicyService } from './LeynorPersonalityPolicyService.js';
import { LeynorPromptBuilder } from './LeynorPromptBuilder.js';
import { LeynorResponseOrchestrator } from './LeynorResponseOrchestrator.js';
import { MarketWeatherService } from './MarketWeatherService.js';

const MODE_INSTRUCTIONS = Object.freeze({
  brief: 'Réponds directement en quelques phrases, sans rapport formel ni introduction générique.',
  standard: 'Réponds de façon structurée et proportionnée à la question, sans développer des sections non demandées.',
  expert: 'Produis une analyse approfondie, explicite les hypothèses, les risques, les limites et les éléments à vérifier.'
});

const INTENT_INSTRUCTIONS = Object.freeze({
  general_conversation: 'La question n’est pas financière. Réponds naturellement en un seul paragraphe court, sans titres, sans sections Introduction/Faits/Conclusion, sans métaphore financière forcée et sans ramener inutilement la réponse à l’investissement.',
  greeting: 'Réponds comme dans une conversation naturelle et brève.',
  conversation: 'Réponds comme dans une conversation naturelle et brève.'
});

export class LeynorAnalysisPipeline {
  constructor({
    contextBuilder = new LeynorContextBuilder(),
    marketWeatherService = new MarketWeatherService(),
    personalityPolicyService = new LeynorPersonalityPolicyService(),
    promptBuilder = new LeynorPromptBuilder()
  } = {}) {
    this.contextBuilder = LeynorAnalysisPipeline.#method(contextBuilder, 'build', 'contextBuilder');
    this.marketWeatherService = LeynorAnalysisPipeline.#method(marketWeatherService, 'evaluate', 'marketWeatherService');
    this.promptBuilder = LeynorAnalysisPipeline.#method(promptBuilder, 'build', 'promptBuilder');
    this.orchestrator = new LeynorResponseOrchestrator({ personalityPolicyService });
    Object.freeze(this);
  }

  prepare({
    question,
    user = {},
    portfolio = {},
    market = {},
    marketIndicators = {},
    goals = [],
    alerts = [],
    evidence = [],
    generatedAt,
    conversationIntent = 'general_finance',
    responseMode = 'standard'
  } = {}) {
    const normalizedQuestion = String(question ?? '').trim();
    if (!normalizedQuestion) throw new TypeError('La question est obligatoire.');

    const weather = this.marketWeatherService.evaluate({
      ...marketIndicators,
      dataQuality: marketIndicators.dataQuality ?? market.dataQuality ?? 'complete',
      observedAt: marketIndicators.observedAt ?? market.asOf ?? null
    });
    const weatherJson = weather.toJSON();
    const normalizedMarket = {
      ...market,
      uncertainty: market.uncertainty ?? LeynorAnalysisPipeline.#uncertainty(weatherJson.condition),
      dataQuality: market.dataQuality ?? marketIndicators.dataQuality ?? 'complete',
      summary: market.summary || weatherJson.summary,
      materialRisk: Boolean(market.materialRisk || ['storm', 'turbulent'].includes(weatherJson.condition))
    };
    const context = this.contextBuilder.build({
      user,
      portfolio,
      market: { ...normalizedMarket, weather: weatherJson },
      goals,
      alerts,
      ...(generatedAt == null ? {} : { generatedAt })
    });
    const contextJson = context.toJSON();
    const combinedEvidence = [...evidence, ...weatherJson.evidence];
    const intentInstruction = INTENT_INSTRUCTIONS[conversationIntent] || '';
    const routedQuestion = `${normalizedQuestion}\n\nIntention détectée : ${conversationIntent}. ${MODE_INSTRUCTIONS[responseMode] ?? MODE_INSTRUCTIONS.standard} ${intentInstruction}`.trim();
    const plan = this.orchestrator.prepare({
      question: routedQuestion,
      user: contextJson.user,
      portfolio: {
        ...contextJson.portfolio,
        lossRate: Math.min(0, contextJson.portfolio.performanceRate ?? 0),
        gainRate: Math.max(0, contextJson.portfolio.performanceRate ?? 0)
      },
      market: contextJson.market,
      evidence: combinedEvidence
    });
    const prompt = this.promptBuilder.build(plan);

    return Object.freeze({
      weather: weatherJson,
      context: contextJson,
      plan: plan.toJSON(),
      prompt: prompt.toJSON()
    });
  }

  static #uncertainty(condition) {
    if (['storm', 'turbulent', 'uncertain'].includes(condition)) return 'high';
    if (condition === 'clear') return 'low';
    return 'normal';
  }

  static #method(value, method, field) {
    if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit exposer ${method}().`);
    return value;
  }
}
