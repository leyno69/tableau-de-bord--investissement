import { LeynorContextSnapshot } from '../../domain/leynor/LeynorContextSnapshot.js';

export class LeynorContextBuilder {
  build({ user = {}, portfolio = {}, market = {}, goals = [], alerts = [], generatedAt = new Date().toISOString() } = {}) {
    return new LeynorContextSnapshot({
      user: {
        expertise: LeynorContextBuilder.#enum(user.expertise, ['beginner', 'intermediate', 'expert'], 'beginner'),
        objective: LeynorContextBuilder.#text(user.objective),
        concerned: Boolean(user.concerned),
        riskTolerance: LeynorContextBuilder.#enum(user.riskTolerance, ['low', 'moderate', 'high'], 'moderate')
      },
      portfolio: {
        value: LeynorContextBuilder.#number(portfolio.value),
        currency: LeynorContextBuilder.#currency(portfolio.currency),
        performanceRate: LeynorContextBuilder.#number(portfolio.performanceRate),
        concentrationRate: LeynorContextBuilder.#number(portfolio.concentrationRate),
        positionCount: LeynorContextBuilder.#integer(portfolio.positionCount),
        cashRate: LeynorContextBuilder.#number(portfolio.cashRate),
        materialRisk: Boolean(portfolio.materialRisk),
        summary: LeynorContextBuilder.#text(portfolio.summary)
      },
      market: {
        uncertainty: LeynorContextBuilder.#enum(market.uncertainty, ['low', 'normal', 'high'], 'normal'),
        dataQuality: LeynorContextBuilder.#enum(market.dataQuality, ['complete', 'partial', 'stale'], 'complete'),
        asOf: LeynorContextBuilder.#optionalDateTime(market.asOf),
        summary: LeynorContextBuilder.#text(market.summary),
        materialRisk: Boolean(market.materialRisk)
      },
      goals: LeynorContextBuilder.#normalizeItems(goals, ['id', 'name', 'status', 'progressRate', 'targetAmount', 'currency']),
      alerts: LeynorContextBuilder.#normalizeItems(alerts, ['id', 'type', 'severity', 'message']),
      generatedAt
    });
  }

  static #normalizeItems(items, fields) {
    if (!Array.isArray(items)) throw new TypeError('Les collections du contexte doivent être des listes.');
    return items.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Chaque élément de contexte doit être un objet.');
      return Object.fromEntries(fields.filter(field => item[field] !== undefined).map(field => [field, item[field]]));
    });
  }

  static #enum(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
  static #text(value) { return typeof value === 'string' ? value.trim() : ''; }
  static #currency(value) { return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value.trim()) ? value.trim().toUpperCase() : 'EUR'; }
  static #number(value) { if (value === undefined || value === null || value === '') return null; const number = Number(value); if (!Number.isFinite(number)) throw new TypeError('Une valeur numérique du contexte est invalide.'); return number; }
  static #integer(value) { const number = LeynorContextBuilder.#number(value); if (number === null) return null; if (!Number.isInteger(number) || number < 0) throw new RangeError('positionCount doit être un entier positif ou nul.'); return number; }
  static #optionalDateTime(value) { if (value === undefined || value === null || value === '') return null; if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new TypeError('market.asOf doit être une date ISO valide.'); return new Date(value).toISOString(); }
}
