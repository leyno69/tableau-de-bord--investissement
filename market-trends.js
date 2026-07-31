import { createEvidenceBackedProbability } from './forecast-evidence.js';

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function scoreMarketNews(item) {
  const impact = clamp(item.impact);
  const relevance = clamp(item.relevance);
  const reliability = clamp(item.reliability);
  const recency = clamp(item.recency);
  const marketBreadth = clamp(item.marketBreadth);
  return Math.round((impact * 0.3 + relevance * 0.25 + reliability * 0.25 + recency * 0.12 + marketBreadth * 0.08) * 100);
}

export function rankMarketNews(items = []) {
  return items.map(item => ({ ...item, importanceScore: scoreMarketNews(item) }))
    .sort((a, b) => b.importanceScore - a.importanceScore);
}

export function createTrendSignal({ asset, direction, probability, horizon, method, evidence, assumptions, limitations, freshness, counterEvidence = [] }) {
  const forecast = createEvidenceBackedProbability({
    event: `${asset} évolue à la ${direction}`,
    probability,
    horizon,
    method,
    evidence,
    assumptions,
    limitations,
    freshness,
    counterEvidence
  });

  return Object.freeze({
    asset,
    direction,
    probability: forecast.probability,
    horizon,
    label: probability >= 0.65 ? 'Signal marqué' : probability >= 0.55 ? 'Signal modéré' : 'Signal faible',
    forecast
  });
}

export const demoTrendSignals = [
  createTrendSignal({
    asset: 'ETF Monde', direction: 'hausse', probability: 0.61, horizon: '1 à 3 mois',
    method: 'Score composite démonstratif fondé sur tendance, volatilité et largeur de marché',
    evidence: ['Tendance de prix positive', 'Participation de plusieurs secteurs'],
    assumptions: ['Absence de choc macroéconomique majeur'],
    limitations: ['Données de démonstration, non connectées en temps réel'],
    freshness: 'Démonstration locale',
    counterEvidence: ['Valorisations élevées sur certaines grandes capitalisations']
  }),
  createTrendSignal({
    asset: 'Semi-conducteurs', direction: 'baisse', probability: 0.56, horizon: '2 à 6 semaines',
    method: 'Score composite démonstratif de momentum et volatilité',
    evidence: ['Volatilité supérieure au marché', 'Momentum court terme fragile'],
    assumptions: ['Pas de surprise positive majeure sur les résultats'],
    limitations: ['Données de démonstration, non connectées en temps réel'],
    freshness: 'Démonstration locale',
    counterEvidence: ['Demande structurelle liée à l’IA']
  })
];

export const demoMarketNews = rankMarketNews([
  { title: 'Décisions des banques centrales', summary: 'Les taux influencent simultanément actions, obligations et devises.', impact: .95, relevance: .92, reliability: .9, recency: .8, marketBreadth: 1 },
  { title: 'Résultats des grandes capitalisations technologiques', summary: 'Leur poids indiciel peut modifier fortement la tendance globale.', impact: .86, relevance: .88, reliability: .86, recency: .9, marketBreadth: .72 },
  { title: 'Tensions sur l’énergie et les matières premières', summary: 'Un choc durable peut affecter inflation, marges et croissance.', impact: .82, relevance: .75, reliability: .82, recency: .76, marketBreadth: .84 }
]);
