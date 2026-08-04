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
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new RangeError('probability doit être comprise entre 0 et 1.');
  return number;
}

export function createRadarAssessment(input = {}) {
  const status = input.status === 'validated' ? 'validated' : 'unavailable';
  if (status === 'unavailable') {
    return Object.freeze({
      status,
      label: text(input.label ?? 'Non calibré', 'assessment.label'),
      reason: text(input.reason ?? 'Aucune calibration empirique validée hors échantillon.', 'assessment.reason')
    });
  }

  return Object.freeze({
    status,
    probability: probability(input.probability),
    calibrationId: text(input.calibrationId, 'assessment.calibrationId'),
    methodologyVersion: text(input.methodologyVersion, 'assessment.methodologyVersion'),
    observedAt: text(input.observedAt, 'assessment.observedAt'),
    label: text(input.label ?? 'Probabilité empirique calibrée', 'assessment.label')
  });
}

export function createOpportunityCard({
  id,
  asset,
  category,
  kind = 'theme',
  thesis,
  assessment,
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
    id: text(id || asset.toLowerCase().replace(/[^a-z0-9]+/gi, '-'), 'id'),
    asset: text(asset, 'asset'),
    category: text(category, 'category'),
    kind: kind === 'asset' ? 'asset' : 'theme',
    thesis: text(thesis, 'thesis'),
    assessment: createRadarAssessment(assessment),
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
    id: signal.id,
    asset: signal.asset,
    category: overrides.category ?? signal.category ?? 'Marché',
    kind: overrides.kind ?? 'theme',
    thesis: overrides.thesis ?? `${signal.asset} présente une ${direction} sur l’horizon ${signal.horizon}. Ce signal invite à approfondir, pas à acheter ou vendre automatiquement.`,
    assessment: overrides.assessment ?? {
      status: 'unavailable',
      reason: 'Signal de démonstration non relié à une calibration validée.'
    },
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
  return Object.freeze([...cards].sort((left, right) => {
    const leftProbability = left.assessment?.status === 'validated' ? left.assessment.probability : -1;
    const rightProbability = right.assessment?.status === 'validated' ? right.assessment.probability : -1;
    return rightProbability - leftProbability;
  }));
}

export const demoOpportunityCards = rankOpportunities(demoTrendSignals.map(signal => opportunityFromTrend(signal, {
  category: signal.category,
  risks: signal.forecast.counterEvidence.length ? signal.forecast.counterEvidence : ['Volatilité et dépendance au contexte de marché']
})));
