import { demoTrendSignals } from './market-trends.js';

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function list(values, field) {
  if (!Array.isArray(values)) throw new TypeError(`${field} doit être un tableau.`);
  return Object.freeze(values.map((value, index) => text(value, `${field}[${index}]`)));
}

function probability(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new RangeError('confidence doit être comprise entre 0 et 1.');
  return number;
}

export function createOpportunityCard({
  asset,
  category,
  thesis,
  confidence,
  horizon,
  favorableEvidence,
  counterEvidence,
  risks,
  limitations,
  sources,
  freshness,
  status = 'à étudier'
}) {
  const card = {
    asset: text(asset, 'asset'),
    category: text(category, 'category'),
    thesis: text(thesis, 'thesis'),
    confidence: probability(confidence),
    horizon: text(horizon, 'horizon'),
    favorableEvidence: list(favorableEvidence, 'favorableEvidence'),
    counterEvidence: list(counterEvidence, 'counterEvidence'),
    risks: list(risks, 'risks'),
    limitations: list(limitations, 'limitations'),
    sources: list(sources, 'sources'),
    freshness: text(freshness, 'freshness'),
    status: text(status, 'status')
  };
  return Object.freeze(card);
}

export function opportunityFromTrend(signal, overrides = {}) {
  if (!signal?.forecast) throw new TypeError('Un signal de tendance complet est obligatoire.');
  const direction = signal.direction === 'baisse' ? 'fragilité' : 'dynamique favorable';
  return createOpportunityCard({
    asset: signal.asset,
    category: overrides.category ?? 'Marché',
    thesis: overrides.thesis ?? `${signal.asset} présente une ${direction} sur l’horizon ${signal.horizon}. Ce signal invite à approfondir, pas à acheter ou vendre automatiquement.`,
    confidence: signal.probability,
    horizon: signal.horizon,
    favorableEvidence: signal.forecast.evidence,
    counterEvidence: signal.forecast.counterEvidence,
    risks: overrides.risks ?? signal.forecast.counterEvidence,
    limitations: signal.forecast.limitations,
    sources: overrides.sources ?? ['Données locales de démonstration', `Méthode : ${signal.forecast.method}`],
    freshness: signal.forecast.dataFreshness,
    status: signal.direction === 'baisse' ? 'risque à surveiller' : 'à étudier'
  });
}

export function rankOpportunities(cards = []) {
  return Object.freeze([...cards].sort((left, right) => right.confidence - left.confidence));
}

export const demoOpportunityCards = rankOpportunities(demoTrendSignals.map((signal, index) => opportunityFromTrend(signal, {
  category: index === 0 ? 'ETF' : 'Secteur',
  risks: index === 0
    ? ['Concentration des indices sur quelques grandes capitalisations', 'Sensibilité aux taux et aux valorisations']
    : ['Volatilité élevée', 'Cycle industriel et risque de correction rapide']
})));
