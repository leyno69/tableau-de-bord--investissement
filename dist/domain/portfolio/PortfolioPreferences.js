const DEFAULT_ALERT_THRESHOLDS = Object.freeze({
  concentrationWarning: 0.25,
  concentrationCritical: 0.4,
  drawdownWarning: 0.1,
  drawdownCritical: 0.2,
  staleQuoteMilliseconds: 86_400_000
});

/** Préférences immuables propres à un portefeuille. */
export class PortfolioPreferences {
  constructor({ portfolioId, baseCurrency = 'EUR', periodsPerYear = 252, alertThresholds = {} }) {
    this.portfolioId = PortfolioPreferences.#text(portfolioId, 'portfolioId');
    this.baseCurrency = PortfolioPreferences.#currency(baseCurrency);
    this.periodsPerYear = PortfolioPreferences.#positiveInteger(periodsPerYear, 'periodsPerYear');
    this.alertThresholds = PortfolioPreferences.#thresholds(alertThresholds);
    Object.freeze(this);
  }

  toJSON() {
    return {
      portfolioId: this.portfolioId,
      baseCurrency: this.baseCurrency,
      periodsPerYear: this.periodsPerYear,
      alertThresholds: this.alertThresholds
    };
  }

  static #text(value, field) {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }

  static #currency(value) {
    const currency = PortfolioPreferences.#text(value, 'baseCurrency').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('baseCurrency doit être une devise ISO à trois lettres.');
    return currency;
  }

  static #positiveInteger(value, field) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) throw new RangeError(`${field} doit être un entier strictement positif.`);
    return number;
  }

  static #thresholds(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('alertThresholds doit être un objet.');
    const merged = { ...DEFAULT_ALERT_THRESHOLDS, ...value };
    for (const key of ['concentrationWarning', 'concentrationCritical', 'drawdownWarning', 'drawdownCritical']) {
      if (!Number.isFinite(merged[key]) || merged[key] < 0 || merged[key] > 1) throw new RangeError(`${key} doit être compris entre 0 et 1.`);
    }
    if (merged.concentrationCritical < merged.concentrationWarning || merged.drawdownCritical < merged.drawdownWarning) {
      throw new RangeError('Un seuil critique ne peut pas être inférieur au seuil warning correspondant.');
    }
    if (!Number.isFinite(merged.staleQuoteMilliseconds) || merged.staleQuoteMilliseconds < 0) {
      throw new RangeError('staleQuoteMilliseconds doit être positif ou nul.');
    }
    return Object.freeze({ ...merged });
  }
}
