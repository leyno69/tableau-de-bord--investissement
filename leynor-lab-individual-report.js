import { createPremiumReport } from './premium-pdf-export.js';

function finite(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} doit être un nombre fini.`);
  return number;
}

function nonEmpty(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function money(value, name = 'value') {
  return `${Math.round(finite(value, name)).toLocaleString('fr-FR')} EUR`;
}

function percent(value, name = 'value') {
  if (value == null) return 'non calculée';
  return `${(finite(value, name) * 100).toFixed(1)} %`;
}

function normalizeEvents(events = []) {
  if (!Array.isArray(events)) throw new TypeError('events doit être un tableau.');
  return events.map((event, index) => {
    if (!event || typeof event !== 'object') throw new TypeError(`events[${index}] est invalide.`);
    const type = nonEmpty(event.type, `events[${index}].type`);
    const month = finite(event.month, `events[${index}].month`);
    const amount = event.amount == null ? null : finite(event.amount, `events[${index}].amount`);
    return Object.freeze({ type, month, amount });
  });
}

function eventLine(event) {
  const amount = event.amount == null ? '' : ` — ${money(event.amount, 'event.amount')}`;
  return `${event.type} au mois ${event.month}${amount}`;
}

export function createLabIndividualPremiumReport({
  generatedAt,
  simulationId,
  seed,
  engineVersion,
  result,
  parameters = {},
  events = [],
  confidence = 'non établi',
  evidence = 'simulation unique'
}) {
  const createdAt = nonEmpty(generatedAt, 'generatedAt');
  const id = nonEmpty(simulationId, 'simulationId');
  const version = nonEmpty(engineVersion, 'engineVersion');
  const normalizedSeed = finite(seed, 'seed');
  const summary = result?.report?.summary;

  if (!summary?.nominal || !summary?.drawdown) {
    throw new TypeError('result.report.summary est incomplet.');
  }

  const portfolioCount = finite(summary.portfolioCount, 'summary.portfolioCount');
  const contributed = finite(summary.contributed, 'summary.contributed');
  const p05 = finite(summary.nominal.p05, 'summary.nominal.p05');
  const median = finite(summary.nominal.median, 'summary.nominal.median');
  const p95 = finite(summary.nominal.p95, 'summary.nominal.p95');
  const realMedian = finite(summary.realMedian, 'summary.realMedian');
  const drawdownMedian = finite(summary.drawdown.median, 'summary.drawdown.median');
  const drawdownP95 = finite(summary.drawdown.p95, 'summary.drawdown.p95');
  const goalProbability = summary.goalProbability == null
    ? null
    : finite(summary.goalProbability, 'summary.goalProbability');

  if (portfolioCount <= 0) throw new RangeError('summary.portfolioCount doit être strictement positif.');
  if (p05 > median || median > p95) {
    throw new RangeError('Les percentiles doivent respecter p05 <= médiane <= p95.');
  }
  if (goalProbability != null && (goalProbability < 0 || goalProbability > 1)) {
    throw new RangeError('summary.goalProbability doit être compris entre 0 et 1.');
  }

  const normalizedEvents = normalizeEvents(events);
  const parameterLines = Object.entries(parameters).map(([key, value]) => `${key} : ${String(value)}`);
  const reproducibilityId = `${version}:${id}:${normalizedSeed}`;

  return createPremiumReport({
    title: `Rapport individuel LEYNOR AI — ${result.label ?? id}`,
    generatedAt: createdAt,
    methodology: [
      result.report?.methodology,
      'Ce document décrit une simulation unique du Laboratoire. Il compare des résultats produits par des hypothèses explicites et ne prédit pas les marchés futurs.'
    ].filter(Boolean).join(' '),
    sections: [
      {
        title: 'Traçabilité et reproductibilité',
        lines: [
          `Identifiant de simulation : ${id}`,
          `Type de moteur : ${result.type ?? 'non renseigné'}`,
          `Version du moteur : ${version}`,
          `Graine : ${normalizedSeed}`,
          `Identifiant reproductible : ${reproducibilityId}`
        ]
      },
      {
        title: 'Paramètres',
        lines: parameterLines.length > 0 ? parameterLines : ['Aucun paramètre complémentaire fourni.']
      },
      {
        title: 'Distribution des résultats',
        lines: [
          `Nombre de portefeuilles simulés : ${portfolioCount}`,
          `Capital total versé : ${money(contributed, 'summary.contributed')}`,
          `Valeur finale percentile 5 : ${money(p05, 'summary.nominal.p05')}`,
          `Valeur finale médiane : ${money(median, 'summary.nominal.median')}`,
          `Valeur finale percentile 95 : ${money(p95, 'summary.nominal.p95')}`,
          `Valeur médiane réelle : ${money(realMedian, 'summary.realMedian')}`,
          `Drawdown médian : ${percent(drawdownMedian, 'summary.drawdown.median')}`,
          `Drawdown percentile 95 : ${percent(drawdownP95, 'summary.drawdown.p95')}`,
          `Probabilité simulée d’atteinte de l’objectif : ${percent(goalProbability, 'summary.goalProbability')}`
        ]
      },
      {
        title: 'Événements et retraits',
        lines: normalizedEvents.length > 0
          ? normalizedEvents.map(eventLine)
          : ['Aucun événement de résilience appliqué.']
      },
      {
        title: 'Confiance et niveau de preuve',
        lines: [
          `Niveau de confiance : ${String(confidence)}`,
          `Niveau de preuve : ${String(evidence)}`,
          'Une simulation unique ne suffit pas à établir une robustesse entre graines ou entre périodes.'
        ]
      }
    ],
    assumptions: [
      'Les rendements, volatilités, corrélations, frais et événements sont des hypothèses de modèle.',
      'La graine et la version du moteur doivent être conservées pour reproduire exactement la simulation.'
    ],
    limitations: [
      'Les résultats dépendent des paramètres fournis et ne constituent pas une prévision.',
      'Le niveau de confiance doit être complété par des campagnes indépendantes, une analyse de sensibilité et une stabilité entre graines.',
      'Ce rapport ne constitue ni une recommandation ni un conseil financier personnalisé.'
    ]
  });
}
