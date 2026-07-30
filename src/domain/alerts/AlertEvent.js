const SEVERITIES = new Set(['INFO', 'WARNING', 'CRITICAL']);

/**
 * Événement d’alerte immuable produit par une règle métier.
 */
export class AlertEvent {
  constructor({ id, ruleId, portfolioId, type, severity, message, triggeredAt, fingerprint, context = {} }) {
    this.id = AlertEvent.#requireText(id, 'id');
    this.ruleId = AlertEvent.#requireText(ruleId, 'ruleId');
    this.portfolioId = AlertEvent.#requireText(portfolioId, 'portfolioId');
    this.type = AlertEvent.#requireText(type, 'type');
    this.severity = AlertEvent.#requireSeverity(severity);
    this.message = AlertEvent.#requireText(message, 'message');
    this.triggeredAt = AlertEvent.#requireDate(triggeredAt);
    this.fingerprint = AlertEvent.#requireText(fingerprint, 'fingerprint');
    this.context = AlertEvent.#freezeSerializable(context);
    Object.freeze(this);
  }

  toJSON() {
    return {
      id: this.id,
      ruleId: this.ruleId,
      portfolioId: this.portfolioId,
      type: this.type,
      severity: this.severity,
      message: this.message,
      triggeredAt: this.triggeredAt,
      fingerprint: this.fingerprint,
      context: this.context
    };
  }

  static #requireText(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${field} doit être une chaîne non vide.`);
    }
    return value.trim();
  }

  static #requireSeverity(value) {
    const severity = AlertEvent.#requireText(value, 'severity').toUpperCase();
    if (!SEVERITIES.has(severity)) {
      throw new RangeError('severity doit valoir INFO, WARNING ou CRITICAL.');
    }
    return severity;
  }

  static #requireDate(value) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      throw new TypeError('triggeredAt doit être une date ISO valide.');
    }
    return new Date(timestamp).toISOString();
  }

  static #freezeSerializable(value) {
    try {
      const cloned = structuredClone(value);
      return AlertEvent.#deepFreeze(cloned);
    } catch {
      throw new TypeError('context doit être sérialisable.');
    }
  }

  static #deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) {
        AlertEvent.#deepFreeze(child);
      }
    }
    return value;
  }
}
