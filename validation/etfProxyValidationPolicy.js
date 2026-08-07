export const BEGINNER_ETF_PROXY_POLICY_V1 = Object.freeze({
  schemaVersion: 1,
  policyId: 'beginner-etf-proxy-validation-v1',
  status: 'empirical-proxy-validation',
  portfolio: Object.freeze([
    Object.freeze({ role: 'wpeaProxy', ticker: 'IWDA.AS', weight: 0.50, isin: 'IE00B4L5Y983', rationale: 'ETF UCITS iShares lancé en 2009 et benchmarké sur MSCI World Index (Net).' }),
    Object.freeze({ role: 'paejExact', ticker: 'PAEJ.PA', weight: 0.15, isin: 'FR0011869312', rationale: 'Instrument réel du preset, existant avant les fenêtres retenues.' }),
    Object.freeze({ role: 'cash', ticker: 'CASH', weight: 0.35, rationale: 'Poche de liquidités technique sans frais de transaction.' })
  ]),
  evidenceTier: 'supporting-empirical-evidence',
  scientificClaimsAllowed: Object.freeze([
    'robustesse empirique du moteur sur des instruments réels et un proxy ETF explicite',
    'détection de contradictions et de preuves adverses',
    'comparaison descriptive avec des distributions simulées appariées'
  ]),
  scientificClaimsForbidden: Object.freeze([
    'validation officielle du MSCI World',
    'équivalence historique entre IWDA et WPEA',
    'preuve de pouvoir prédictif',
    'garantie de rendement futur'
  ])
});
