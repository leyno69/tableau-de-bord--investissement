import { buildCorrelationMatrix, cholesky, normalizeRegimePlan, regimeAtMonth } from './leynor-lab-regimes.js';

export const ADVANCED_MAX_PORTFOLIOS = 50000;
export const ADVANCED_MAX_YEARS = 50;

function finite(value, name, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new TypeError(`${name} doit être compris entre ${min} et ${max}.`);
  return number;
}

function integer(value, name, limits) {
  const valueNumber = Number(value);
  const number = Math.floor(finite(valueNumber, name, limits));
  if (number !== valueNumber) throw new TypeError(`${name} doit être un entier.`);
  return number;
}

function seededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function standardNormal(random) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function correlatedNormals(random, lower) {
  const independent = lower.map(() => standardNormal(random));
  return lower.map((row, i) => row.slice(0, i + 1).reduce((sum, coefficient, j) => sum + coefficient * independent[j], 0));
}

function percentile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - (index - lower)) + sorted[upper] * (index - lower);
}

function freezeAllocation(allocation = []) {
  if (!Array.isArray(allocation) || allocation.length === 0) throw new TypeError('allocation doit contenir au moins un actif.');
  const result = allocation.map((asset, index) => Object.freeze({
    id: String(asset.id || `asset-${index + 1}`),
    label: String(asset.label || asset.id || `Actif ${index + 1}`),
    weight: finite(asset.weight, `allocation[${index}].weight`, { min: 0, max: 1 }),
    annualReturn: finite(asset.annualReturn, `allocation[${index}].annualReturn`, { min: -0.99, max: 2 }),
    annualVolatility: finite(asset.annualVolatility, `allocation[${index}].annualVolatility`, { min: 0, max: 2 })
  }));
  if (Math.abs(result.reduce((sum, asset) => sum + asset.weight, 0) - 1) > 1e-8) throw new RangeError('La somme des pondérations doit être égale à 1.');
  return Object.freeze(result);
}

export function createAdvancedLabDefinition({
  portfolioCount = 10000,
  years = 20,
  initialAmount = 3000,
  monthlyContribution = 100,
  annualInflation = 0.02,
  annualFees = 0.0025,
  goal = 100000,
  seed = 69,
  commonCorrelation = 0.35,
  regimePlan = [{ regime: 'croissance', months: 60 }, { regime: 'crise', months: 12 }, { regime: 'reprise', months: 36 }, { regime: 'croissance', months: Infinity }],
  allocation
+} = {}) {
  const normalizedAllocation = freezeAllocation(allocation);
  const definition = {
    portfolioCount: integer(portfolioCount, 'portfolioCount', { min: 1, max: ADVANCED_MAX_PORTFOLIOS }),
    years: integer(years, 'years', { min: 1, max: ADVANCED_MAX_YEARS }),
    initialAmount: finite(initialAmount, 'initialAmount', { min: 0 }),
    monthlyContribution: finite(monthlyContribution, 'monthlyContribution', { min: 0 }),
    annualInflation: finite(annualInflation, 'annualInflation', { min: -0.2, max: 0.5 }),
    annualFees: finite(annualFees, 'annualFees', { min: 0, max: 0.2 }),
    goal: goal == null ? null : finite(goal, 'goal', { min: 0 }),
    seed: integer(seed, 'seed', { min: 0, max: 4294967295 }),
    commonCorrelation: finite(commonCorrelation, 'commonCorrelation', { min: 0, max: 0.95 }),
    regimePlan: normalizeRegimePlan(regimePlan),
    allocation: normalizedAllocation
  };
  return Object.freeze(definition);
}

function simulateOne(definition, random, correlationFactor) {
  const months = definition.years * 12;
  let value = definition.initialAmount;
  let peak = value;
  let maxDrawdown = 0;
  let monthsBelowContributions = 0;

  for (let month = 0; month < months; month += 1) {
    const regime = regimeAtMonth(definition.regimePlan, month);
    const shocks = correlatedNormals(random, correlationFactor);
    let portfolioReturn = 0;
    for (let index = 0; index < definition.allocation.length; index += 1) {
      const asset = definition.allocation[index];
      const adjustedAnnualReturn = Math.max(-0.99, asset.annualReturn + regime.returnShift);
      const monthlyMean = Math.pow(1 + adjustedAnnualReturn, 1 / 12) - 1;
      const monthlyVolatility = asset.annualVolatility * regime.volatilityMultiplier / Math.sqrt(12);
      portfolioReturn += asset.weight * (monthlyMean + monthlyVolatility * shocks[index]);
    }
    value = Math.max(0, value * (1 + portfolioReturn - definition.annualFees / 12) + definition.monthlyContribution);
    peak = Math.max(peak, value);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
    const contributionsToDate = definition.initialAmount + definition.monthlyContribution * (month + 1);
    if (value < contributionsToDate) monthsBelowContributions += 1;
  }

  return {
    finalValue: value,
    realFinalValue: value / Math.pow(1 + definition.annualInflation, definition.years),
    maxDrawdown,
    monthsBelowContributions,
    reachedGoal: definition.goal == null ? null : value >= definition.goal
  };
}

function summarize(definition, results, elapsedMs) {
  const finalValues = results.map(item => item.finalValue).sort((a, b) => a - b);
  const realValues = results.map(item => item.realFinalValue).sort((a, b) => a - b);
  const drawdowns = results.map(item => item.maxDrawdown).sort((a, b) => a - b);
  const underwater = results.map(item => item.monthsBelowContributions).sort((a, b) => a - b);
  const goalHits = definition.goal == null ? null : results.filter(item => item.reachedGoal).length;
  return Object.freeze({
    portfolioCount: results.length,
    contributed: definition.initialAmount + definition.monthlyContribution * definition.years * 12,
    elapsedMs,
    throughputPerSecond: elapsedMs > 0 ? results.length / (elapsedMs / 1000) : null,
    nominal: Object.freeze({ p01: percentile(finalValues, .01), p05: percentile(finalValues, .05), p25: percentile(finalValues, .25), median: percentile(finalValues, .5), p75: percentile(finalValues, .75), p95: percentile(finalValues, .95), p99: percentile(finalValues, .99), minimum: finalValues[0], maximum: finalValues.at(-1) }),
    real: Object.freeze({ p05: percentile(realValues, .05), median: percentile(realValues, .5), p95: percentile(realValues, .95) }),
    drawdown: Object.freeze({ median: percentile(drawdowns, .5), p95: percentile(drawdowns, .95), p99: percentile(drawdowns, .99), maximum: drawdowns.at(-1) }),
    monthsBelowContributions: Object.freeze({ median: percentile(underwater, .5), p95: percentile(underwater, .95) }),
    goalProbability: goalHits == null ? null : goalHits / results.length
  });
}

export function runAdvancedLabSimulation(input) {
  const definition = input?.allocation ? createAdvancedLabDefinition(input) : input;
  if (!definition || !Object.isFrozen(definition)) throw new TypeError('Une définition avancée valide est requise.');
  const random = seededRandom(definition.seed);
  const factor = cholesky(buildCorrelationMatrix(definition.allocation.length, definition.commonCorrelation));
  const started = Date.now();
  const results = Array.from({ length: definition.portfolioCount }, () => simulateOne(definition, random, factor));
  return Object.freeze({ definition, summary: summarize(definition, results, Date.now() - started), methodology: Object.freeze({ model: 'Monte-Carlo mensuel corrélé avec régimes de marché et graine reproductible', warnings: Object.freeze(['Les paramètres sont des hypothèses, pas des prévisions.', 'Une corrélation commune simplifie les dépendances réelles.', 'Les distributions de rendement restent gaussiennes et sous-estiment potentiellement les événements extrêmes.']) }) });
}

export async function runAdvancedLabSimulationBatched(input, { batchSize = 250, onProgress = () => {}, signal } = {}) {
  const definition = input?.allocation ? createAdvancedLabDefinition(input) : input;
  const random = seededRandom(definition.seed);
  const factor = cholesky(buildCorrelationMatrix(definition.allocation.length, definition.commonCorrelation));
  const results = [];
  const started = Date.now();
  while (results.length < definition.portfolioCount) {
    if (signal?.aborted) throw new DOMException('Simulation annulée.', 'AbortError');
    const count = Math.min(batchSize, definition.portfolioCount - results.length);
    for (let index = 0; index < count; index += 1) results.push(simulateOne(definition, random, factor));
    onProgress(Object.freeze({ completed: results.length, total: definition.portfolioCount, ratio: results.length / definition.portfolioCount }));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return Object.freeze({ definition, summary: summarize(definition, results, Date.now() - started), methodology: Object.freeze({ model: 'Monte-Carlo mensuel corrélé, régimes et exécution par lots', warnings: Object.freeze(['Résultats conditionnels aux hypothèses.', 'Aucune certitude de marché.', 'Tester plusieurs graines et hypothèses.']) }) });
}

export function buildExhaustiveLeynorReport(report) {
  const { definition, summary } = report;
  const goalPercent = summary.goalProbability == null ? null : Math.round(summary.goalProbability * 1000) / 10;
  return Object.freeze({
    title: 'Compte rendu exhaustif — Laboratoire Premium LEYNOR',
    executiveSummary: Object.freeze([
      `${summary.portfolioCount.toLocaleString('fr-FR')} portefeuilles ont été simulés sur ${definition.years} ans.`,
      `La médiane nominale atteint ${Math.round(summary.nominal.median).toLocaleString('fr-FR')} € pour ${Math.round(summary.contributed).toLocaleString('fr-FR')} € versés.`,
      `Le scénario défavorable à 5 % termine à ${Math.round(summary.nominal.p05).toLocaleString('fr-FR')} € et le scénario favorable à 95 % à ${Math.round(summary.nominal.p95).toLocaleString('fr-FR')} €.`,
      goalPercent == null ? 'Aucun objectif financier n’a été défini.' : `La probabilité simulée d’atteindre l’objectif est de ${goalPercent} %.`
    ]),
    risk: Object.freeze({ medianDrawdown: summary.drawdown.median, severeDrawdown: summary.drawdown.p95, extremeDrawdown: summary.drawdown.p99, medianUnderwaterMonths: summary.monthsBelowContributions.median }),
    assumptions: Object.freeze({ allocation: definition.allocation, inflation: definition.annualInflation, fees: definition.annualFees, correlation: definition.commonCorrelation, regimes: definition.regimePlan, seed: definition.seed }),
    limitations: report.methodology.warnings,
    verdict: summary.goalProbability == null ? 'Résultat exploratoire sans objectif.' : summary.goalProbability >= .8 ? 'Objectif robuste dans les hypothèses testées.' : summary.goalProbability >= .5 ? 'Objectif plausible mais sensible aux hypothèses.' : 'Objectif fragile dans les hypothèses testées.',
    nextExperiments: Object.freeze(['Comparer une allocation plus défensive.', 'Augmenter et diminuer les frais de 0,25 point.', 'Tester une crise plus longue.', 'Comparer trois graines supplémentaires.', 'Remplacer la corrélation commune par une matrice empirique.'])
  });
}
