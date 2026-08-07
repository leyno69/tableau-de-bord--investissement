import { MarketWeatherReport } from '../../domain/leynor/MarketWeatherReport.js';

const DEFINITIONS = Object.freeze({
  clear: { label: 'Ciel dégagé', summary: 'Le climat de marché est favorable, avec des signaux globalement solides.' },
  brightening: { label: 'Éclaircies', summary: 'Les signaux s’améliorent, mais la tendance demande encore confirmation.' },
  mixed: { label: 'Temps variable', summary: 'Les indicateurs sont partagés et ne dessinent pas de direction nette.' },
  uncertain: { label: 'Vent d’incertitude', summary: 'L’incertitude domine malgré l’absence de stress extrême.' },
  turbulent: { label: 'Zone de turbulence', summary: 'Plusieurs indicateurs signalent une dégradation sensible du climat.' },
  storm: { label: 'Tempête', summary: 'Le marché présente un stress marqué et plusieurs signaux défavorables convergent.' }
});

export class MarketWeatherService {
  evaluate({
    indexReturnRate = 0,
    breadthRate = 0.5,
    volatilityIndex = 20,
    drawdownRate = 0,
    trendStrength = 0,
    dataQuality = 'complete',
    observedAt = null
  } = {}) {
    const values = {
      indexReturnRate: MarketWeatherService.#rate(indexReturnRate, 'indexReturnRate', -1, 10),
      breadthRate: MarketWeatherService.#rate(breadthRate, 'breadthRate', 0, 1),
      volatilityIndex: MarketWeatherService.#number(volatilityIndex, 'volatilityIndex', 0, 200),
      drawdownRate: MarketWeatherService.#rate(drawdownRate, 'drawdownRate', -1, 0),
      trendStrength: MarketWeatherService.#rate(trendStrength, 'trendStrength', -1, 1),
      dataQuality: MarketWeatherService.#enum(dataQuality, ['complete', 'partial', 'stale'], 'dataQuality'),
      observedAt: MarketWeatherService.#date(observedAt)
    };

    const contributions = [
      MarketWeatherService.#indicator('Performance récente', values.indexReturnRate, MarketWeatherService.#performanceScore(values.indexReturnRate), 'return'),
      MarketWeatherService.#indicator('Largeur de marché', values.breadthRate, (values.breadthRate - 0.5) * 80, 'breadth'),
      MarketWeatherService.#indicator('Volatilité', values.volatilityIndex, MarketWeatherService.#volatilityScore(values.volatilityIndex), 'volatility'),
      MarketWeatherService.#indicator('Repli depuis le sommet', values.drawdownRate, Math.max(-40, values.drawdownRate * 200), 'drawdown'),
      MarketWeatherService.#indicator('Force de tendance', values.trendStrength, values.trendStrength * 30, 'trend')
    ];

    const rawScore = contributions.reduce((sum, indicator) => sum + indicator.contribution, 0);
    const qualityPenalty = values.dataQuality === 'complete' ? 0 : values.dataQuality === 'partial' ? 8 : 15;
    const score = MarketWeatherService.#clamp(rawScore - qualityPenalty, -100, 100);
    const condition = MarketWeatherService.#condition(score, values.volatilityIndex, values.dataQuality);
    const definition = DEFINITIONS[condition];
    const confidence = MarketWeatherService.#confidence(values.dataQuality, contributions.length);
    const evidence = contributions.map(indicator => `${indicator.label} : ${MarketWeatherService.#display(indicator.value, indicator.kind)}.`);
    const warnings = [];
    if (values.dataQuality === 'partial') warnings.push('La météo repose sur des données partielles.');
    if (values.dataQuality === 'stale') warnings.push('La météo repose sur des données périmées.');
    if (values.volatilityIndex >= 35) warnings.push('La volatilité est élevée.');

    return new MarketWeatherReport({
      condition,
      label: definition.label,
      score,
      confidence,
      summary: definition.summary,
      indicators: contributions,
      evidence,
      warnings
    });
  }

  static #performanceScore(rate) { return MarketWeatherService.#clamp(rate * 400, -35, 35); }
  static #volatilityScore(value) {
    if (value <= 15) return 25;
    if (value <= 20) return 10;
    if (value <= 25) return 0;
    if (value <= 35) return -20;
    return -40;
  }
  static #condition(score, volatility, quality) {
    if (volatility >= 45 || score <= -55) return 'storm';
    if (score <= -25) return 'turbulent';
    if (quality !== 'complete' || score <= -8) return 'uncertain';
    if (score < 12) return 'mixed';
    if (score < 35) return 'brightening';
    return 'clear';
  }
  static #confidence(quality, count) {
    if (quality === 'stale' || count < 3) return 'low';
    if (quality === 'partial') return 'medium';
    return 'high';
  }
  static #indicator(label, value, contribution, kind) {
    return Object.freeze({ label, value, contribution: Number(contribution.toFixed(2)), kind });
  }
  static #display(value, kind) {
    if (kind === 'volatility') return Number(value).toFixed(1);
    return `${(Number(value) * 100).toFixed(1)} %`;
  }
  static #date(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new TypeError('observedAt doit être une date valide.');
    return value;
  }
  static #enum(value, allowed, field) { if (!allowed.includes(value)) throw new RangeError(`${field} est invalide.`); return value; }
  static #rate(value, field, min, max) { return MarketWeatherService.#number(value, field, min, max); }
  static #number(value, field, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) throw new RangeError(`${field} est invalide.`);
    return number;
  }
  static #clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value.toFixed(2)))); }
}
