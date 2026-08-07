import { createProbabilityAssessment } from './probability-assessment.js';

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

export function createTrendSignal({ id, asset, category, theme = 'Secteur', direction, probability, score, momentum, volatility, risk, horizon, method, evidence, assumptions, limitations, freshness, counterEvidence = [], instruments = [] }) {
  const forecast = createProbabilityAssessment({
    event: `${asset} évolue à la ${direction}`,
    probability,
    horizon,
    method,
    evidence,
    assumptions,
    limitations,
    dataFreshness: freshness,
    counterEvidence
  });

  return Object.freeze({
    id: id || asset.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
    asset,
    category,
    theme,
    direction,
    probability: forecast.probability,
    score: Math.round(clamp(score ?? probability) * 100),
    momentum,
    volatility,
    risk,
    horizon,
    instruments: Object.freeze([...instruments]),
    label: probability >= 0.65 ? 'Signal marqué' : probability >= 0.55 ? 'Signal modéré' : 'Signal faible',
    forecast
  });
}

export function rankTrendSignals(items = [], { favorites = [] } = {}) {
  const favoriteSet = new Set(favorites);
  return [...items].sort((a, b) => {
    const favoriteDelta = Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id));
    return favoriteDelta || b.score - a.score || b.probability - a.probability;
  });
}

const base = {
  method: 'Score composite démonstratif fondé sur momentum, volatilité, largeur et facteurs macroéconomiques',
  assumptions: ['Absence de choc macroéconomique majeur'],
  limitations: ['Données de démonstration, non connectées en temps réel'],
  freshness: 'Démonstration locale'
};

export const trendCategories = Object.freeze([
  'Marchés mondiaux', 'Technologie', 'Énergie', 'Matières premières', 'Finance', 'Santé', 'Consommation',
  'Industrie', 'Mobilité', 'Immobilier', 'Télécommunications', 'Environnement', 'Infrastructure numérique',
  'Crypto', 'ETF', 'Devises', 'Obligations', 'Macroéconomie'
]);

export const demoTrendSignals = [
  createTrendSignal({ ...base, id:'world-equities', asset:'Actions mondiales', category:'Marchés mondiaux', direction:'hausse', probability:.63, score:.72, momentum:'Positif', volatility:'Moyenne', risk:'Modéré', horizon:'1 à 3 mois', evidence:['Tendance globale positive','Participation de plusieurs zones'], counterEvidence:['Valorisations élevées aux États-Unis'], instruments:['ETF World','MSCI ACWI'] }),
  createTrendSignal({ ...base, id:'ai', asset:'Intelligence artificielle', category:'Technologie', theme:'Mégatendance', direction:'hausse', probability:.72, score:.88, momentum:'Très fort', volatility:'Élevée', risk:'Élevé', horizon:'3 à 12 mois', evidence:['Investissements massifs dans le calcul','Demande structurelle en automatisation'], counterEvidence:['Concentration des valorisations'], instruments:['Semi-conducteurs','Cloud','Logiciels IA'] }),
  createTrendSignal({ ...base, id:'semiconductors', asset:'Semi-conducteurs', category:'Technologie', direction:'hausse', probability:.66, score:.82, momentum:'Fort', volatility:'Élevée', risk:'Élevé', horizon:'1 à 6 mois', evidence:['Demande liée à l’IA','Capacité de calcul stratégique'], counterEvidence:['Cycle industriel volatil'], instruments:['ETF semi-conducteurs','TSMC','ASML'] }),
  createTrendSignal({ ...base, id:'cybersecurity', asset:'Cybersécurité', category:'Technologie', theme:'Mégatendance', direction:'hausse', probability:.65, score:.78, momentum:'Positif', volatility:'Moyenne', risk:'Modéré', horizon:'6 à 18 mois', evidence:['Hausse des risques numériques','Dépenses récurrentes des entreprises'], counterEvidence:['Concurrence intense'], instruments:['ETF cybersécurité','Logiciels de sécurité'] }),
  createTrendSignal({ ...base, id:'nuclear', asset:'Nucléaire et uranium', category:'Énergie', theme:'Mégatendance', direction:'hausse', probability:.67, score:.81, momentum:'Fort', volatility:'Élevée', risk:'Élevé', horizon:'6 à 24 mois', evidence:['Relance de capacités nucléaires','Besoin d’électricité pilotable'], counterEvidence:['Risque réglementaire'], instruments:['Uranium','Producteurs nucléaires'] }),
  createTrendSignal({ ...base, id:'renewables', asset:'Énergies renouvelables', category:'Énergie', direction:'hausse', probability:.58, score:.67, momentum:'Neutre à positif', volatility:'Élevée', risk:'Élevé', horizon:'12 à 36 mois', evidence:['Électrification progressive','Investissements réseau'], counterEvidence:['Sensibilité aux taux'], instruments:['Solaire','Éolien','Réseaux'] }),
  createTrendSignal({ ...base, id:'oil-gas', asset:'Pétrole et gaz', category:'Énergie', direction:'baisse', probability:.54, score:.55, momentum:'Neutre', volatility:'Élevée', risk:'Élevé', horizon:'1 à 6 mois', evidence:['Ralentissement potentiel de la demande'], counterEvidence:['Risque géopolitique'], instruments:['Brent','Majors énergétiques'] }),
  createTrendSignal({ ...base, id:'gold', asset:'Or', category:'Matières premières', direction:'hausse', probability:.62, score:.73, momentum:'Positif', volatility:'Moyenne', risk:'Modéré', horizon:'3 à 12 mois', evidence:['Diversification monétaire','Demande de couverture'], counterEvidence:['Sensibilité aux taux réels'], instruments:['Or physique','ETF or'] }),
  createTrendSignal({ ...base, id:'copper', asset:'Cuivre et métaux critiques', category:'Matières premières', theme:'Mégatendance', direction:'hausse', probability:.68, score:.84, momentum:'Fort', volatility:'Élevée', risk:'Élevé', horizon:'12 à 36 mois', evidence:['Électrification mondiale','Contraintes d’offre'], counterEvidence:['Cycle chinois incertain'], instruments:['Cuivre','Lithium','Terres rares'] }),
  createTrendSignal({ ...base, id:'banks', asset:'Banques et assurances', category:'Finance', direction:'hausse', probability:.57, score:.62, momentum:'Modéré', volatility:'Moyenne', risk:'Modéré', horizon:'3 à 12 mois', evidence:['Marges encore soutenues','Valorisations contenues'], counterEvidence:['Risque de crédit'], instruments:['Banques européennes','Assureurs'] }),
  createTrendSignal({ ...base, id:'healthcare', asset:'Santé et pharmacie', category:'Santé', direction:'hausse', probability:.61, score:.71, momentum:'Positif', volatility:'Faible à moyenne', risk:'Modéré', horizon:'6 à 24 mois', evidence:['Demande défensive','Vieillissement démographique'], counterEvidence:['Risque réglementaire'], instruments:['ETF santé','Pharma','Medtech'] }),
  createTrendSignal({ ...base, id:'biotech', asset:'Biotechnologies', category:'Santé', theme:'Mégatendance', direction:'hausse', probability:.56, score:.66, momentum:'Sélectif', volatility:'Très élevée', risk:'Très élevé', horizon:'12 à 36 mois', evidence:['Innovation thérapeutique','Pipeline de traitements'], counterEvidence:['Risque d’échec clinique'], instruments:['Biotech','Génomique'] }),
  createTrendSignal({ ...base, id:'luxury', asset:'Luxe et consommation premium', category:'Consommation', direction:'baisse', probability:.55, score:.58, momentum:'Fragile', volatility:'Moyenne', risk:'Modéré', horizon:'1 à 6 mois', evidence:['Ralentissement de la demande asiatique'], counterEvidence:['Pouvoir de marque élevé'], instruments:['Luxe européen'] }),
  createTrendSignal({ ...base, id:'defense', asset:'Défense et aéronautique', category:'Industrie', theme:'Mégatendance', direction:'hausse', probability:.70, score:.86, momentum:'Très fort', volatility:'Moyenne', risk:'Modéré à élevé', horizon:'6 à 36 mois', evidence:['Budgets militaires en hausse','Carnets de commandes visibles'], counterEvidence:['Dépendance aux décisions publiques'], instruments:['ETF défense','Aéronautique'] }),
  createTrendSignal({ ...base, id:'robotics', asset:'Robotique et automatisation', category:'Industrie', theme:'Mégatendance', direction:'hausse', probability:.66, score:.80, momentum:'Fort', volatility:'Élevée', risk:'Élevé', horizon:'12 à 36 mois', evidence:['Pénurie de main-d’œuvre','Gains de productivité'], counterEvidence:['Cycle d’investissement industriel'], instruments:['Robotique','Automatisation'] }),
  createTrendSignal({ ...base, id:'ev-batteries', asset:'Véhicules électriques et batteries', category:'Mobilité', direction:'hausse', probability:.57, score:.65, momentum:'Contrasté', volatility:'Très élevée', risk:'Très élevé', horizon:'12 à 36 mois', evidence:['Électrification progressive'], counterEvidence:['Pression sur les marges','Concurrence chinoise'], instruments:['Batteries','Recharge','Constructeurs EV'] }),
  createTrendSignal({ ...base, id:'reits', asset:'Immobilier coté', category:'Immobilier', direction:'hausse', probability:.56, score:.61, momentum:'Reprise fragile', volatility:'Moyenne', risk:'Modéré', horizon:'6 à 18 mois', evidence:['Potentiel de détente des taux'], counterEvidence:['Bureaux encore fragiles'], instruments:['REIT résidentiels','Logistique'] }),
  createTrendSignal({ ...base, id:'space', asset:'Spatial et satellites', category:'Télécommunications', theme:'Mégatendance', direction:'hausse', probability:.59, score:.69, momentum:'Positif', volatility:'Très élevée', risk:'Très élevé', horizon:'12 à 36 mois', evidence:['Baisse des coûts de lancement','Demande de connectivité'], counterEvidence:['Modèles économiques encore jeunes'], instruments:['Satellites','Lanceurs'] }),
  createTrendSignal({ ...base, id:'water', asset:'Eau et traitement des déchets', category:'Environnement', theme:'Mégatendance', direction:'hausse', probability:.64, score:.76, momentum:'Positif', volatility:'Faible à moyenne', risk:'Modéré', horizon:'12 à 36 mois', evidence:['Besoins structurels d’infrastructure','Rareté croissante'], counterEvidence:['Valorisations parfois élevées'], instruments:['ETF eau','Recyclage'] }),
  createTrendSignal({ ...base, id:'datacenters', asset:'Data centers et réseaux', category:'Infrastructure numérique', theme:'Mégatendance', direction:'hausse', probability:.71, score:.87, momentum:'Très fort', volatility:'Élevée', risk:'Élevé', horizon:'6 à 24 mois', evidence:['Croissance du cloud et de l’IA','Besoin de capacité électrique'], counterEvidence:['Contraintes énergétiques'], instruments:['Data centers','Réseaux','Refroidissement'] }),
  createTrendSignal({ ...base, id:'bitcoin', asset:'Bitcoin et cryptoactifs', category:'Crypto', direction:'hausse', probability:.58, score:.70, momentum:'Fort mais instable', volatility:'Très élevée', risk:'Très élevé', horizon:'1 à 12 mois', evidence:['Adoption institutionnelle progressive'], counterEvidence:['Risque réglementaire et spéculatif'], instruments:['Bitcoin','Ethereum'] }),
  createTrendSignal({ ...base, id:'smallcaps', asset:'Petites capitalisations', category:'ETF', direction:'hausse', probability:.57, score:.64, momentum:'Reprise possible', volatility:'Élevée', risk:'Élevé', horizon:'6 à 18 mois', evidence:['Potentiel si détente monétaire'], counterEvidence:['Sensibilité au crédit'], instruments:['ETF Small Caps'] }),
  createTrendSignal({ ...base, id:'usd', asset:'Dollar américain', category:'Devises', direction:'baisse', probability:.55, score:.57, momentum:'Neutre à fragile', volatility:'Faible à moyenne', risk:'Modéré', horizon:'3 à 12 mois', evidence:['Écart de taux susceptible de se réduire'], counterEvidence:['Statut de valeur refuge'], instruments:['USD/EUR','Dollar Index'] }),
  createTrendSignal({ ...base, id:'bonds', asset:'Obligations de qualité', category:'Obligations', direction:'hausse', probability:.60, score:.70, momentum:'Positif', volatility:'Faible à moyenne', risk:'Faible à modéré', horizon:'6 à 18 mois', evidence:['Rendements redevenus attractifs'], counterEvidence:['Inflation persistante'], instruments:['Obligations d’État','Investment Grade'] }),
  createTrendSignal({ ...base, id:'rates', asset:'Taux directeurs', category:'Macroéconomie', direction:'baisse', probability:.62, score:.74, momentum:'Désinflation graduelle', volatility:'Moyenne', risk:'Macro', horizon:'3 à 12 mois', evidence:['Inflation en ralentissement','Croissance moins dynamique'], counterEvidence:['Services encore inflationnistes'], instruments:['Taux courts','Courbe des taux'] })
];

export const demoMarketNews = rankMarketNews([
  { title: 'Décisions des banques centrales', summary: 'Les taux influencent simultanément actions, obligations, immobilier et devises.', impact: .95, relevance: .92, reliability: .9, recency: .8, marketBreadth: 1 },
  { title: 'Dépenses d’infrastructure liées à l’IA', summary: 'Les investissements en calcul, énergie et réseaux soutiennent plusieurs chaînes de valeur.', impact: .9, relevance: .93, reliability: .84, recency: .9, marketBreadth: .86 },
  { title: 'Budgets de défense et tensions géopolitiques', summary: 'La visibilité des commandes augmente pour l’aéronautique, la défense et le spatial.', impact: .87, relevance: .84, reliability: .88, recency: .85, marketBreadth: .76 },
  { title: 'Tensions sur l’énergie et les matières premières', summary: 'Un choc durable peut affecter inflation, marges, croissance et métaux critiques.', impact: .82, relevance: .75, reliability: .82, recency: .76, marketBreadth: .84 }
]);
