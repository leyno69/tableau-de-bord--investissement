import { runMassSimulation } from './leynor-premium-lab.js';
import { runCorrelatedMassSimulation } from './leynor-correlated-lab.js';

export const SUPPORTED_HORIZONS = Object.freeze([5, 10, 15, 20, 30]);

function normalizeHorizons(horizons) {
  const values = horizons == null ? SUPPORTED_HORIZONS : horizons;
  if (!Array.isArray(values) || values.length < 2 || values.length > SUPPORTED_HORIZONS.length) {
    throw new RangeError('horizons doit contenir entre 2 et 5 valeurs prises parmi 5, 10, 15, 20 et 30 ans.');
  }
  const normalized = values.map((value, index) => {
    const years = Number(value);
    if (!SUPPORTED_HORIZONS.includes(years)) {
      throw new RangeError(`horizons[${index}] doit valoir 5, 10, 15, 20 ou 30.`);
    }
    return years;
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new RangeError('Les horizons doivent être uniques.');
  }
  return Object.freeze([...normalized].sort((a, b) => a - b));
}

function extractMetrics(report) {
  return Object.freeze({
    nominalMedian: report.summary.nominal.median,
    realMedian: report.summary.real?.median ?? null,
    drawdownP95: report.summary.drawdown.p95,
    goalProbability: report.summary.goalProbability ?? null
  });
}

export function runMultiHorizonCampaign({ type = 'independent', definition, horizons } = {}) {
  if (type !== 'independent' && type !== 'correlated') {
    throw new RangeError('type doit valoir independent ou correlated.');
  }
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('definition est requise.');
  }

  const normalizedHorizons = normalizeHorizons(horizons);
  const run = type === 'correlated' ? runCorrelatedMassSimulation : runMassSimulation;
  const results = normalizedHorizons.map(years => {
    const report = run({ ...definition, years });
    return Object.freeze({ years, report, metrics: extractMetrics(report) });
  });

  return Object.freeze({
    type,
    horizons: normalizedHorizons,
    results: Object.freeze(results),
    methodology: Object.freeze({
      statement: 'Chaque horizon est simulé avec la même graine et les mêmes hypothèses, seule la durée varie.',
      interpretation: 'La campagne compare l’effet de l’horizon dans le modèle ; elle ne prédit pas les marchés futurs.',
      limitation: 'Les résultats restent sensibles aux rendements, volatilités, frais, inflation, corrélations et événements modélisés.'
    })
  });
}
