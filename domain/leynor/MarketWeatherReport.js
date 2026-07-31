const CONDITIONS = Object.freeze(['clear', 'brightening', 'mixed', 'uncertain', 'turbulent', 'storm']);
const CONFIDENCE = Object.freeze(['low', 'medium', 'high']);

export class MarketWeatherReport {
  constructor({ condition, label, score, confidence, summary, indicators = [], evidence = [], warnings = [] }) {
    this.condition = MarketWeatherReport.#enum(condition, CONDITIONS, 'condition');
    this.label = MarketWeatherReport.#text(label, 'label');
    this.score = MarketWeatherReport.#score(score);
    this.confidence = MarketWeatherReport.#enum(confidence, CONFIDENCE, 'confidence');
    this.summary = MarketWeatherReport.#text(summary, 'summary');
    this.indicators = Object.freeze(MarketWeatherReport.#objects(indicators, 'indicators'));
    this.evidence = Object.freeze(MarketWeatherReport.#texts(evidence, 'evidence'));
    this.warnings = Object.freeze(MarketWeatherReport.#texts(warnings, 'warnings'));
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({
      condition: this.condition,
      label: this.label,
      score: this.score,
      confidence: this.confidence,
      summary: this.summary,
      indicators: this.indicators,
      evidence: this.evidence,
      warnings: this.warnings
    });
  }

  static #enum(value, allowed, field) {
    if (!allowed.includes(value)) throw new RangeError(`${field} est invalide.`);
    return value;
  }

  static #text(value, field) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }

  static #score(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < -100 || number > 100) throw new RangeError('score doit être compris entre -100 et 100.');
    return Number(number.toFixed(2));
  }

  static #texts(value, field) {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) {
      throw new TypeError(`${field} doit être une liste de chaînes.`);
    }
    return value.map(item => item.trim());
  }

  static #objects(value, field) {
    if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw new TypeError(`${field} doit être une liste d’objets.`);
    }
    return value.map(item => Object.freeze({ ...item }));
  }
}
