const THEMATIC_ASSETS = Object.freeze({
  ai: [
    { name: 'NVIDIA', ticker: 'NVDA', marketSymbol: 'NVDA', type: 'Action', exposure: 'Forte', role: 'Accélérateurs de calcul et infrastructure IA', risk: 'Élevé' },
    { name: 'Microsoft', ticker: 'MSFT', marketSymbol: 'MSFT', type: 'Action', exposure: 'Forte', role: 'Cloud, logiciels et services d’IA', risk: 'Modéré à élevé' },
    { name: 'TSMC', ticker: 'TSM', marketSymbol: 'TSM', type: 'Action', exposure: 'Forte', role: 'Fabrication des semi-conducteurs avancés', risk: 'Élevé' },
    { name: 'Global X Robotics & Artificial Intelligence ETF', ticker: 'BOTZ', marketSymbol: 'BOTZ', type: 'ETF', exposure: 'Diversifiée', role: 'Panier international lié à la robotique et à l’IA', risk: 'Élevé' }
  ],
  datacenters: [
    { name: 'Equinix', ticker: 'EQIX', marketSymbol: 'EQIX', type: 'Action', exposure: 'Directe', role: 'Exploitation de centres de données interconnectés', risk: 'Modéré à élevé' },
    { name: 'Digital Realty Trust', ticker: 'DLR', marketSymbol: 'DLR', type: 'Action', exposure: 'Directe', role: 'Immobilier et infrastructures de centres de données', risk: 'Modéré à élevé' },
    { name: 'Vertiv', ticker: 'VRT', marketSymbol: 'VRT', type: 'Action', exposure: 'Forte', role: 'Alimentation électrique et refroidissement', risk: 'Élevé' },
    { name: 'Pacer Data & Infrastructure Real Estate ETF', ticker: 'SRVR', marketSymbol: 'SRVR', type: 'ETF', exposure: 'Diversifiée', role: 'Panier d’infrastructures numériques et immobilières', risk: 'Élevé' }
  ],
  defense: [
    { name: 'Airbus', ticker: 'AIR.PA', marketSymbol: 'AIR.PA', type: 'Action', exposure: 'Mixte', role: 'Aéronautique civile, défense et spatial', risk: 'Modéré à élevé' },
    { name: 'Thales', ticker: 'HO.PA', marketSymbol: 'HO.PA', type: 'Action', exposure: 'Forte', role: 'Électronique, cybersécurité et systèmes de défense', risk: 'Modéré à élevé' },
    { name: 'Rheinmetall', ticker: 'RHM.DE', marketSymbol: 'RHM.DE', type: 'Action', exposure: 'Directe', role: 'Équipements et systèmes terrestres', risk: 'Élevé' },
    { name: 'iShares U.S. Aerospace & Defense ETF', ticker: 'ITA', marketSymbol: 'ITA', type: 'ETF', exposure: 'Diversifiée', role: 'Panier de sociétés américaines de défense', risk: 'Élevé' }
  ]
});

function representativeAssets(themeId) {
  return THEMATIC_ASSETS[themeId] || [];
}

function proofLevel(card) {
  if (card.confidence >= .7) return 'B';
  if (card.confidence >= .6) return 'C';
  return 'D';
}

export { THEMATIC_ASSETS, representativeAssets, proofLevel };
