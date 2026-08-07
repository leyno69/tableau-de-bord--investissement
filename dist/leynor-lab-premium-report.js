import { createPremiumReport } from './premium-pdf-export.js';

function finite(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} doit être un nombre fini.`);
  return number;
}

function percent(value) {
  if (value == null) return 'non calculée';
  return `${(finite(value, 'probability') * 100).toFixed(1)} %`;
}

function money(value) {
  return `${Math.round(finite(value, 'value')).toLocaleString('fr-FR')} EUR`;
}

function normalizeBatchReport(batchReport) {
  if (!batchReport?.definition?.name || !Array.isArray(batchReport?.results) || batchReport.results.length === 0) {
    throw new TypeError('Un rapport de lot LEYNOR complet est requis.');
  }
  return batchReport;
}

function resultSection(result, index) {
  const summary = result?.report?.summary;
  if (!summary?.nominal || !summary?.drawdown) {
    throw new TypeError(`results[${index}].report.summary est incomplet.`);
  }

  return Object.freeze({
    title: `${result.label} — ${result.type === 'correlated' ? 'simulation corrélée' : 'simulation indépendante'}`,
    lines: Object.freeze([
      `Nombre de portefeuilles simulés : ${finite(summary.portfolioCount, 'portfolioCount')}`,
      `Capital total versé : ${money(summary.contributed)}`,
      `Valeur finale percentile 5 : ${money(summary.nominal.p05)}`,
      `Valeur finale médiane : ${money(summary.nominal.median)}`,
      `Valeur finale percentile 95 : ${money(summary.nominal.p95)}`,
      `Valeur médiane réelle : ${money(summary.realMedian)}`,
      `Drawdown médian : ${percent(summary.drawdown.median)}`,
      `Drawdown percentile 95 : ${percent(summary.drawdown.p95)}`,
      `Probabilité simulée d’atteinte de l’objectif : ${percent(summary.goalProbability)}`
    ])
  });
}

export function createLabBatchPremiumReport(batchReport, { generatedAt } = {}) {
  const normalized = normalizeBatchReport(batchReport);
  if (typeof generatedAt !== 'string' || generatedAt.trim() === '') {
    throw new TypeError('generatedAt doit être une chaîne non vide.');
  }

  return createPremiumReport({
    title: `Rapport Laboratoire LEYNOR AI — ${normalized.definition.name}`,
    generatedAt: generatedAt.trim(),
    methodology: [
      normalized.methodology?.execution,
      normalized.methodology?.reproducibility,
      'Les résultats comparent des distributions simulées. Ils ne prédisent pas les marchés futurs et ne désignent aucun scénario comme meilleur.'
    ].filter(Boolean).join(' '),
    sections: normalized.results.map(resultSection),
    assumptions: [
      'Chaque simulation utilise les paramètres, allocations, matrices de corrélation et graines fournis au Laboratoire.',
      'Les percentiles décrivent les distributions produites par le modèle sélectionné.'
    ],
    limitations: [
      normalized.methodology?.limitation ?? 'Les limites dépendent du moteur de simulation utilisé.',
      'Les corrélations, rendements et volatilités saisis sont des hypothèses de modèle.',
      'Ce rapport ne constitue ni une recommandation ni un conseil financier personnalisé.'
    ]
  });
}
