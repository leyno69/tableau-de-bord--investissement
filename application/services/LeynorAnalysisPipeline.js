import { LeynorContextBuilder } from './LeynorContextBuilder.js';
import { LeynorPersonalityPolicyService } from './LeynorPersonalityPolicyService.js';
import { LeynorPromptBuilder } from './LeynorPromptBuilder.js';
import { LeynorResponseOrchestrator } from './LeynorResponseOrchestrator.js';
import { MarketWeatherService } from './MarketWeatherService.js';

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
    generatedAt
  } = {}) {
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
    const plan = this.orchestrator.prepare({
      question,
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
