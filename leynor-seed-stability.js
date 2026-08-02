import { runMassSimulation } from './leynor-premium-lab.js';
import { runCorrelatedMassSimulation } from './leynor-correlated-lab.js';

const MIN_SEEDS = 3;
const MAX_SEEDS = 50;

function normalizeSeeds(seeds) {
  if (!Array.isArray(seeds) || seeds.length < MIN_SEEDS || seeds.length > MAX_SEEDS) {
    throw new RangeError(`seeds doit contenir entre ${MIN_SEEDS} et ${MAX_SEEDS} valeurs.`);
  }
  const normalized = seeds.map((seed, index) => {
    const value = Number(seed);
    if (!Number.isInteger(value) || value < 0) throw new TypeError(`seeds[${index}] doit être un entier positif ou nul.`);
    return value;
  });
  if (new Set(normalized).size !== normalized.length) throw new RangeError('Les graines doivent être uniques.');
  return Object.freeze(normalized);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

function summarize(values) {
  const average = mean(values);
  const deviation = standardDeviation(values);
  return Object.freeze({
    mean: average,
    standardDeviation: deviation,
    coefficientOfVariation: average === 0 ? null : Math.abs(deviation / average),
    minimum: Math.min(...values),
    maximum: Math.max(...values)
  });
}

export function analyzeSeedStability({ type = 'independent', definition, seeds } = {}) {
  if (type !== 'independent' && type !== 'correlated') {
    throw new RangeError('type doit valoir independent ou correlated.');
  }
  if (!definition || typeof definition !== 'object') throw new TypeError('definition est requise.');
  const normalizedSeeds = normalizeSeeds(seeds);
  const run = type === 'correlated' ? runCorrelatedMassSimulation : runMassSimulation;
  const reports = normalizedSeeds.map(seed => Object.freeze({
    seed,
    report: run({ ...definition, seed })
  }));

  const medians = reports.map(({ report }) => report.summary.nominal.median);
  const drawdowns = reports.map(({ report }) => report.summary.drawdown.p95);
  const goalProbabilities = reports
    .map(({ report }) => report.summary.goalProbability)
    .filter(value => value != null);

  return Object.freeze({
    type,
    seeds: normalizedSeeds,
    reports: Object.freeze(reports),
    stability: Object.freeze({
      nominalMedian: summarize(medians),
      drawdownP95: summarize(drawdowns),
      goalProbability: goalProbabilities.length === reports.length ? summarize(goalProbabilities) : null
    }),
    methodology: Object.freeze({
      statement: 'La stabilité est mesurée par répétition du même scénario avec plusieurs graines indépendantes.',
      interpretation: 'Une dispersion faible indique une meilleure stabilité numérique sous les hypothèses du modèle, pas une certitude sur les marchés futurs.',
      limitation: 'Cette analyse ne mesure ni le risque de modèle, ni la validité des rendements, volatilités ou corrélations saisis.'
    })
  });
}

export { MAX_SEEDS, MIN_SEEDS };
