import { LeynorResponsePlan } from '../../domain/leynor/LeynorResponsePlan.js';

const PRINCIPLES = Object.freeze([
  'Aider l’utilisateur à comprendre sans décider à sa place.',
  'Distinguer clairement les faits, les hypothèses et les incertitudes.',
  'Ne jamais créer de FOMO, de promesse de gain ou de certitude artificielle.',
  'Utiliser les métaphores comme introduction, jamais comme preuve.',
  'Laisser l’utilisateur plus confiant, plus éclairé ou plus compétent.'
]);

export class LeynorResponseOrchestrator {
  constructor({ personalityPolicyService } = {}) {
    if (!personalityPolicyService || typeof personalityPolicyService.createPolicy !== 'function') {
      throw new TypeError('personalityPolicyService doit exposer createPolicy().');
    }
    this.personalityPolicyService = personalityPolicyService;
    Object.freeze(this);
  }

  prepare({ question, user = {}, portfolio = {}, market = {}, evidence = [] } = {}) {
    const normalizedQuestion = LeynorResponseOrchestrator.#requiredText(question, 'question');
    const policy = this.personalityPolicyService.createPolicy({
      lossRate: portfolio.lossRate ?? 0,
      gainRate: portfolio.gainRate ?? 0,
      userConcern: Boolean(user.concerned),
      marketUncertainty: market.uncertainty ?? 'normal',
      dataQuality: market.dataQuality ?? 'complete',
      expertise: user.expertise ?? 'beginner',
      fomoPrompt: LeynorResponseOrchestrator.#isFomoPrompt(normalizedQuestion),
      materialRisk: Boolean(portfolio.materialRisk || market.materialRisk)
    });

    const warnings = [];
    if (market.dataQuality && market.dataQuality !== 'complete') warnings.push('Les données disponibles sont incomplètes ou périmées.');
    if (policy.riskDisclosure === 'required') warnings.push('Les risques matériels doivent être explicités.');
    if (policy.uncertaintyDisclosure === 'required') warnings.push('Les incertitudes doivent être distinguées des faits.');
    if (Array.isArray(market.weather?.warnings)) warnings.push(...market.weather.warnings);

    const instructions = [
      `Adopter un ton ${policy.tone}.`,
      policy.humorLevel === 'disabled' ? 'Ne pas utiliser d’humour.' : 'Un humour léger est permis s’il reste utile et discret.',
      policy.metaphorLevel === 'disabled' ? 'Ne pas utiliser de métaphore.' : 'Une métaphore météo peut introduire la réponse si elle est pertinente et immédiatement expliquée par des faits.',
      policy.jargonLevel === 'technical' ? 'Le vocabulaire technique est autorisé.' : 'Privilégier des mots simples et expliquer tout terme technique.',
      policy.explanationDepth === 'detailed' ? 'Développer le raisonnement étape par étape.' : policy.explanationDepth === 'concise' ? 'Répondre de façon concise sans supprimer les réserves importantes.' : 'Fournir une explication structurée de longueur modérée.',
      `Respecter la structure : ${policy.responseStructure.join(' → ')}.`
    ];

    const context = {
      user: LeynorResponseOrchestrator.#sanitizeUser(user),
      portfolio: LeynorResponseOrchestrator.#sanitizePortfolio(portfolio),
      market: LeynorResponseOrchestrator.#sanitizeMarket(market)
    };

    return new LeynorResponsePlan({
      question: normalizedQuestion,
      policy: policy.toJSON(),
      principles: PRINCIPLES,
      context,
      instructions,
      evidence: LeynorResponseOrchestrator.#evidence(evidence),
      warnings: [...new Set(warnings)]
    });
  }

  static #isFomoPrompt(question) {
    return /(va exploser|trade du siècle|devenir riche|garanti|sans risque|all[- ]in|acheter maintenant)/i.test(question);
  }

  static #sanitizeUser(user) {
    return Object.freeze({
      expertise: ['beginner', 'intermediate', 'expert'].includes(user.expertise) ? user.expertise : 'beginner',
      concerned: Boolean(user.concerned),
      objective: typeof user.objective === 'string' ? user.objective.trim() : ''
    });
  }

  static #sanitizePortfolio(portfolio) {
    return Object.freeze({
      value: LeynorResponseOrchestrator.#optionalNumber(portfolio.value),
      currency: typeof portfolio.currency === 'string' ? portfolio.currency.trim().toUpperCase() : 'EUR',
      lossRate: LeynorResponseOrchestrator.#optionalNumber(portfolio.lossRate) ?? 0,
      gainRate: LeynorResponseOrchestrator.#optionalNumber(portfolio.gainRate) ?? 0,
      concentrationRate: LeynorResponseOrchestrator.#optionalNumber(portfolio.concentrationRate),
      materialRisk: Boolean(portfolio.materialRisk)
    });
  }

  static #sanitizeMarket(market) {
    const weather = market.weather && typeof market.weather === 'object' && !Array.isArray(market.weather)
      ? Object.freeze({
        condition: typeof market.weather.condition === 'string' ? market.weather.condition : '',
        label: typeof market.weather.label === 'string' ? market.weather.label : '',
        score: LeynorResponseOrchestrator.#optionalNumber(market.weather.score),
        confidence: typeof market.weather.confidence === 'string' ? market.weather.confidence : '',
        summary: typeof market.weather.summary === 'string' ? market.weather.summary : '',
        indicators: Array.isArray(market.weather.indicators) ? market.weather.indicators : [],
        warnings: Array.isArray(market.weather.warnings) ? market.weather.warnings : []
      })
      : null;
    return Object.freeze({
      uncertainty: ['low', 'normal', 'high'].includes(market.uncertainty) ? market.uncertainty : 'normal',
      dataQuality: ['complete', 'partial', 'stale'].includes(market.dataQuality) ? market.dataQuality : 'complete',
      materialRisk: Boolean(market.materialRisk),
      summary: typeof market.summary === 'string' ? market.summary.trim() : '',
      weather
    });
  }

  static #evidence(evidence) {
    if (!Array.isArray(evidence)) throw new TypeError('evidence doit être une liste.');
    return evidence.map(item => LeynorResponseOrchestrator.#requiredText(item, 'evidence'));
  }

  static #optionalNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError('Une donnée numérique du contexte est invalide.');
    return number;
  }

  static #requiredText(value, field) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }
}
