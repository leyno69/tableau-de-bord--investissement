export class LeynorContextSnapshot {
  constructor({ user, portfolio, market, goals = [], alerts = [], generatedAt }) {
    this.user = Object.freeze(LeynorContextSnapshot.#object(user, 'user'));
    this.portfolio = Object.freeze(LeynorContextSnapshot.#object(portfolio, 'portfolio'));
    this.market = Object.freeze(LeynorContextSnapshot.#object(market, 'market'));
    this.goals = Object.freeze(LeynorContextSnapshot.#list(goals, 'goals'));
    this.alerts = Object.freeze(LeynorContextSnapshot.#list(alerts, 'alerts'));
    this.generatedAt = LeynorContextSnapshot.#dateTime(generatedAt);
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({
      user: this.user,
      portfolio: this.portfolio,
      market: this.market,
      goals: this.goals,
      alerts: this.alerts,
      generatedAt: this.generatedAt
    });
  }

  static #object(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} doit être un objet.`);
    return JSON.parse(JSON.stringify(value));
  }

  static #list(value, field) {
    if (!Array.isArray(value)) throw new TypeError(`${field} doit être une liste.`);
    return value.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError(`${field} doit contenir des objets.`);
      return Object.freeze(JSON.parse(JSON.stringify(item)));
    });
  }

  static #dateTime(value) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new TypeError('generatedAt doit être une date ISO valide.');
    return new Date(value).toISOString();
  }
}
