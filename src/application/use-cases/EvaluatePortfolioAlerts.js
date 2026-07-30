import { AlertEvent } from '../../domain/alerts/AlertEvent.js';

/**
 * Évalue des règles d’alerte indépendantes et déduplique leurs événements.
 *
 * Une règle expose :
 * - id : identifiant stable ;
 * - evaluate(context) : retourne zéro, un ou plusieurs candidats d’alerte.
 */
export class EvaluatePortfolioAlerts {
  constructor({ rules, clock = () => new Date(), idGenerator = crypto.randomUUID } = {}) {
    if (!Array.isArray(rules)) {
      throw new TypeError('rules doit être un tableau.');
    }
    if (typeof clock !== 'function' || typeof idGenerator !== 'function') {
      throw new TypeError('clock et idGenerator doivent être des fonctions.');
    }

    this.rules = Object.freeze([...rules]);
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async execute({ portfolioId, context, existingFingerprints = [] }) {
    const normalizedPortfolioId = EvaluatePortfolioAlerts.#requireText(portfolioId, 'portfolioId');
    if (!context || typeof context !== 'object') {
      throw new TypeError('context doit être un objet.');
    }
    if (!Array.isArray(existingFingerprints)) {
      throw new TypeError('existingFingerprints doit être un tableau.');
    }

    const known = new Set(existingFingerprints.map(value => String(value)));
    const events = [];
    const triggeredAt = EvaluatePortfolioAlerts.#requireDate(this.clock());

    for (const rule of this.rules) {
      EvaluatePortfolioAlerts.#requireRule(rule);
      const candidates = await rule.evaluate(context);
      const normalizedCandidates = candidates == null
        ? []
        : Array.isArray(candidates) ? candidates : [candidates];

      for (const candidate of normalizedCandidates) {
        if (!candidate || typeof candidate !== 'object') {
          throw new TypeError(`La règle ${rule.id} doit retourner des objets d’alerte.`);
        }

        const fingerprint = EvaluatePortfolioAlerts.#requireText(
          candidate.fingerprint,
          'fingerprint'
        );

        if (known.has(fingerprint)) {
          continue;
        }

        const event = new AlertEvent({
          id: String(this.idGenerator()),
          ruleId: rule.id,
          portfolioId: normalizedPortfolioId,
          type: candidate.type,
          severity: candidate.severity,
          message: candidate.message,
          triggeredAt,
          fingerprint,
          context: candidate.context ?? {}
        });

        known.add(fingerprint);
        events.push(event);
      }
    }

    return Object.freeze({
      portfolioId: normalizedPortfolioId,
      evaluatedAt: triggeredAt,
      events: Object.freeze(events),
      fingerprints: Object.freeze([...known])
    });
  }

  static #requireRule(rule) {
    if (!rule || typeof rule !== 'object') {
      throw new TypeError('Chaque règle doit être un objet.');
    }
    EvaluatePortfolioAlerts.#requireText(rule.id, 'rule.id');
    if (typeof rule.evaluate !== 'function') {
      throw new TypeError(`La règle ${rule.id} doit implémenter evaluate().`);
    }
  }

  static #requireText(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${field} doit être une chaîne non vide.`);
    }
    return value.trim();
  }

  static #requireDate(value) {
    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      throw new TypeError('clock doit retourner une date valide.');
    }
    return new Date(timestamp).toISOString();
  }
}
