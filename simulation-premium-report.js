import { createPremiumReport } from './premium-pdf-export.js';

function finiteNumber(value, field) {
  if (!Number.isFinite(value)) throw new TypeError(`${field} doit être un nombre fini.`);
  return value;
}

function percent(value) {
  return `${(value * 100).toFixed(1)} %`;
}

function euro(value) {
  return `${Math.round(value).toLocaleString('fr-FR')} EUR`;
}

export function createSimulationPremiumReport({ generatedAt, parameters, results, confidence, evidence }) {
  const initialDeposit = finiteNumber(parameters?.initialDeposit, 'parameters.initialDeposit');
  const monthlyContribution = finiteNumber(parameters?.monthlyContribution, 'parameters.monthlyContribution');
  const years = finiteNumber(parameters?.years, 'parameters.years');
  const assumedReturn = finiteNumber(parameters?.assumedReturn, 'parameters.assumedReturn');
  const medianFinalValue = finiteNumber(results?.medianFinalValue, 'results.medianFinalValue');
  const p10 = finiteNumber(results?.p10, 'results.p10');
  const p90 = finiteNumber(results?.p90, 'results.p90');
  const maxDrawdown = finiteNumber(results?.maxDrawdown, 'results.maxDrawdown');
  const goalProbability = finiteNumber(results?.goalProbability, 'results.goalProbability');

  if (initialDeposit < 0 || monthlyContribution < 0 || years <= 0) {
    throw new RangeError('Les paramètres financiers doivent être positifs et la durée strictement supérieure à zéro.');
  }
  if (p10 > medianFinalValue || medianFinalValue > p90) {
    throw new RangeError('Les percentiles doivent respecter p10 <= médiane <= p90.');
  }
  if (goalProbability < 0 || goalProbability > 1) {
    throw new RangeError('results.goalProbability doit être compris entre 0 et 1.');
  }

  return createPremiumReport({
    title: 'Rapport de simulation LEYNOR AI',
    generatedAt,
    methodology: 'Comparaison de scénarios financiers hypothétiques. Les résultats décrivent une distribution simulée et ne constituent pas une prévision.',
    sections: [
      {
        title: 'Paramètres',
        lines: [
          `Dépôt initial : ${euro(initialDeposit)}`,
          `Versement mensuel : ${euro(monthlyContribution)}`,
          `Durée : ${years} ans`,
          `Rendement hypothétique : ${percent(assumedReturn)}`
        ]
      },
      {
        title: 'Résultats simulés',
        lines: [
          `Valeur finale médiane : ${euro(medianFinalValue)}`,
          `Percentile 10 : ${euro(p10)}`,
          `Percentile 90 : ${euro(p90)}`,
          `Drawdown maximal observé : ${percent(maxDrawdown)}`,
          `Probabilité simulée d'atteinte de l'objectif : ${percent(goalProbability)}`
        ]
      },
      {
        title: 'Confiance et preuve',
        lines: [
          `Niveau de confiance : ${String(confidence ?? 'non renseigné')}`,
          `Niveau de preuve : ${String(evidence ?? 'non renseigné')}`
        ]
      }
    ],
    assumptions: [
      'Le rendement sélectionné est une hypothèse de travail et non une prévision.',
      'Les distributions dépendent des paramètres et de la méthode de simulation.'
    ],
    limitations: [
      'Les événements de marché futurs peuvent différer fortement des scénarios simulés.',
      'Ce rapport ne constitue pas un conseil financier personnalisé.'
    ]
  });
}
