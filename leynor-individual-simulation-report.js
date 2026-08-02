import { createPremiumReport, buildPremiumPdf } from './premium-pdf-export.js';

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function optionalPercent(value) {
  return value == null ? 'non calculée' : `${(finite(value, 'pourcentage') * 100).toFixed(2)} %`;
}

function money(value) {
  return `${Math.round(finite(value, 'montant')).toLocaleString('fr-FR')} EUR`;
}

function fingerprint({ simulationId, engineVersion, seed, generatedAt }) {
  const text = `${simulationId}|${engineVersion}|${seed}|${generatedAt}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `LEYNOR-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}

function eventLine(event) {
  if (event.type === 'withdrawal') return `Mois ${event.month} : retrait planifié de ${money(event.amount)}`;
  if (event.type === 'contribution_pause') return `Mois ${event.month} : interruption des versements`;
  if (event.type === 'contribution_resume') return `Mois ${event.month} : reprise des versements`;
  return `Mois ${event.month} : événement ${event.type}`;
}

export function createIndividualSimulationReport({
  simulationId,
  label,
  engineVersion,
  generatedAt,
  report,
  confidence = null,
  evidence = null
} = {}) {
  const definition = report?.definition;
  const summary = report?.summary;
  if (!definition || !summary?.nominal || !summary?.drawdown || !report?.methodology) {
    throw new TypeError('Un résultat de simulation complet est requis.');
  }

  const id = requiredText(simulationId, 'simulationId');
  const version = requiredText(engineVersion, 'engineVersion');
  const date = requiredText(generatedAt, 'generatedAt');
  const title = requiredText(label ?? id, 'label');
  const allocation = definition.allocation.map(asset => `${asset.label} : ${(asset.weight * 100).toFixed(2)} %`).join(' ; ');
  const events = Array.isArray(definition.events) ? definition.events : [];
  const reproducibilityId = fingerprint({ simulationId: id, engineVersion: version, seed: definition.seed, generatedAt: date });

  return createPremiumReport({
    title: `Rapport individuel LEYNOR AI — ${title}`,
    generatedAt: date,
    methodology: [
      report.methodology.model,
      report.methodology.statement,
      'Le rapport décrit cette exécution uniquement et ne classe aucun portefeuille.'
    ].filter(Boolean).join(' '),
    sections: [
      {
        title: 'Identification et reproductibilité',
        lines: [
          `Identifiant de simulation : ${id}`,
          `Version du moteur : ${version}`,
          `Graine : ${definition.seed}`,
          `Empreinte de reproduction : ${reproducibilityId}`
        ]
      },
      {
        title: 'Paramètres et hypothèses',
        lines: [
          `Nombre de trajectoires : ${definition.portfolioCount}`,
          `Horizon : ${definition.years} ans`,
          `Capital initial : ${money(definition.initialAmount)}`,
          `Versement mensuel : ${money(definition.monthlyContribution)}`,
          `Inflation annuelle : ${optionalPercent(definition.annualInflation)}`,
          `Frais annuels : ${optionalPercent(definition.annualFees)}`,
          `Objectif : ${definition.goal == null ? 'non défini' : money(definition.goal)}`,
          `Allocation : ${allocation}`
        ]
      },
      {
        title: 'Résultats',
        lines: [
          `Valeur finale percentile 5 : ${money(summary.nominal.p05)}`,
          `Valeur finale médiane : ${money(summary.nominal.median)}`,
          `Valeur finale percentile 95 : ${money(summary.nominal.p95)}`,
          `Valeur réelle médiane : ${money(summary.realMedian)}`,
          `Drawdown médian : ${optionalPercent(summary.drawdown.median)}`,
          `Drawdown percentile 95 : ${optionalPercent(summary.drawdown.p95)}`,
          `Drawdown maximum : ${summary.drawdown.maximum == null ? 'non disponible' : optionalPercent(summary.drawdown.maximum)}`,
          `Probabilité simulée d’atteinte de l’objectif : ${optionalPercent(summary.goalProbability)}`,
          `Retraits planifiés : ${summary.plannedWithdrawals == null ? 'non applicable' : money(summary.plannedWithdrawals)}`,
          `Mois sans contribution : ${summary.pausedMonths == null ? 'non applicable' : summary.pausedMonths}`,
          `Fréquence des pertes : ${summary.lossFrequency == null ? 'non disponible' : optionalPercent(summary.lossFrequency)}`,
          `Durée de récupération : ${summary.recoveryDuration == null ? 'non disponible' : `${summary.recoveryDuration} mois`}`
        ]
      },
      {
        title: 'Événements appliqués',
        lines: events.length ? events.map(eventLine) : ['Aucun événement daté.']
      },
      {
        title: 'Confiance et preuve',
        lines: [
          `Niveau de confiance : ${confidence == null ? 'non calculé' : requiredText(confidence, 'confidence')}`,
          `Niveau de preuve : ${evidence == null ? 'non calculé' : requiredText(evidence, 'evidence')}`
        ]
      }
    ],
    assumptions: [
      'Les rendements, volatilités, frais, inflation, corrélations et événements proviennent des paramètres de la simulation.',
      'Une graine fixe garantit la reproductibilité numérique, pas la validité prédictive.'
    ],
    limitations: [
      report.methodology.limitation ?? report.methodology.interpretationWarning ?? 'Les résultats dépendent entièrement des hypothèses saisies.',
      'Les métriques absentes du moteur sont indiquées comme non disponibles et ne sont jamais inventées.',
      'Ce document ne constitue ni une prévision ni un conseil financier personnalisé.'
    ]
  });
}

export function buildIndividualSimulationPdf(input) {
  return buildPremiumPdf(createIndividualSimulationReport(input));
}
