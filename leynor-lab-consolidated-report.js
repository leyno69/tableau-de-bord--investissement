import { buildPremiumPdf } from './premium-pdf-export.js';

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requiredIsoDate(value, field) {
  const text = requiredText(value, field);
  if (!Number.isFinite(Date.parse(text))) {
    throw new TypeError(`${field} doit être une date ISO valide.`);
  }
  return text;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right)));
}

function reportInventoryLine(entry) {
  const pdf = entry.pdf
    ? `${entry.pdf.filename} (${entry.pdf.size} octets)`
    : 'PDF non matérialisé dans le catalogue';
  return `${entry.generatedAt} — ${entry.simulationId} — graine ${entry.seed} — ${entry.engineVersion} — ${pdf}`;
}

export function createLabConsolidatedPremiumReport({ catalog, campaignId, generatedAt }) {
  if (!catalog || typeof catalog.list !== 'function') {
    throw new TypeError('catalog doit exposer une méthode list().');
  }

  const normalizedCampaignId = requiredText(campaignId, 'campaignId');
  const normalizedGeneratedAt = requiredIsoDate(generatedAt, 'generatedAt');
  const entries = catalog.list({ campaignId: normalizedCampaignId });

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Aucun rapport individuel pour la campagne ${normalizedCampaignId}.`);
  }

  const engines = uniqueSorted(entries.map(entry => entry.engineVersion));
  const seeds = uniqueSorted(entries.map(entry => entry.seed));
  const firstGeneratedAt = entries[0].generatedAt;
  const lastGeneratedAt = entries[entries.length - 1].generatedAt;
  const withPdf = entries.filter(entry => entry.pdf != null).length;

  return Object.freeze({
    title: `Rapport consolidé LEYNOR AI — ${normalizedCampaignId}`,
    generatedAt: normalizedGeneratedAt,
    methodology: 'Assemblage déterministe des rapports individuels catalogués pour une même campagne. Ce document inventorie les simulations exécutées et leur traçabilité. Il ne calcule aucun score IGL ni aucune pondération sans campagne empirique dédiée.',
    sections: Object.freeze([
      Object.freeze({
        title: 'Périmètre de la campagne',
        lines: Object.freeze([
          `Campagne : ${normalizedCampaignId}`,
          `Rapports individuels : ${entries.length}`,
          `Période couverte : ${firstGeneratedAt} à ${lastGeneratedAt}`,
          `Versions du moteur : ${engines.join(', ')}`,
          `Graines distinctes : ${seeds.length}`,
          `PDF individuels matérialisés : ${withPdf}/${entries.length}`
        ])
      }),
      Object.freeze({
        title: 'Inventaire reproductible',
        lines: Object.freeze(entries.map(reportInventoryLine))
      }),
      Object.freeze({
        title: 'Contrôles méthodologiques',
        lines: Object.freeze([
          'Tous les éléments proviennent du catalogue versionné des rapports individuels.',
          'Les rapports sont ordonnés par date puis par identifiant reproductible.',
          'Aucune simulation extérieure à la campagne demandée n’est incluse.',
          'Le niveau de confiance consolidé reste à calculer entre graines, hypothèses et périodes.',
          'Le niveau de preuve consolidé reste à établir par reproduction indépendante des campagnes.'
        ])
      })
    ]),
    assumptions: Object.freeze([
      'Le catalogue fourni est complet pour la campagne au moment de la génération.',
      'Les métadonnées de chaque rapport individuel ont été validées avant leur catalogage.'
    ]),
    limitations: Object.freeze([
      'Ce rapport d’assemblage ne remplace pas l’analyse statistique factorielle des résultats bruts.',
      'Aucune conclusion d’investissement ne peut être déduite du seul nombre de simulations.',
      'Aucun score IGL ni poids de composante n’est produit à ce stade.'
    ])
  });
}

export function buildLabConsolidatedPdf(input) {
  return buildPremiumPdf(createLabConsolidatedPremiumReport(input));
}
