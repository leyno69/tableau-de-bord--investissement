const MAX_PORTFOLIOS = 10000;
const MAX_YEARS = 50;

function finite(value, name, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${name} doit être compris entre ${min} et ${max}.`);
  }
  return number;
}

function integer(value, name, limits) {
  const number = Math.floor(finite(value, name, limits));
  if (number !== Number(value)) throw new TypeError(`${name} doit être un entier.`);
  return number;
}

function createSeededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normal(random) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted, probability) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function normalizeAllocation(allocation = []) {
  if (!Array.isArray(allocation) || allocation.length === 0) throw new TypeError('allocation doit contenir au moins un actif.');
  const normalized = allocation.map((asset, index) => Object.freeze({
    id: String(asset.id || `asset-${index + 1}`),
    label: String(asset.label || asset.id || `Actif ${index + 1}`),
    weight: finite(asset.weight, `allocation[${index}].weight`, { min: 0, max: 1 }),
    annualReturn: finite(asset.annualReturn, `allocation[${index}].annualReturn`, { min: -0.99, max: 2 }),
    annualVolatility: finite(asset.annualVolatility, `allocation[${index}].annualVolatility`, { min: 0, max: 2 })
  }));
  const totalWeight = normalized.reduce((sum, asset) => sum + asset.weight, 0);
  if (Math.abs(totalWeight - 1) > 1e-8) throw new RangeError('La somme des pondérations doit être égale à 1.');
  return Object.freeze(normalized);
}

export function createMassSimulationDefinition({
  portfolioCount = 1000,
  years = 20,
  initialAmount = 10000,
  monthlyContribution = 100,
  annualInflation = 0.02,
  annualFees = 0.0025,
  goal = null,
  seed = 42,
  allocation
} = {}) {
  const definition = {
    portfolioCount: integer(portfolioCount, 'portfolioCount', { min: 1, max: MAX_PORTFOLIOS }),
    years: integer(years, 'years', { min: 1, max: MAX_YEARS }),
    initialAmount: finite(initialAmount, 'initialAmount', { min: 0 }),
    monthlyContribution: finite(monthlyContribution, 'monthlyContribution', { min: 0 }),
    annualInflation: finite(annualInflation, 'annualInflation', { min: -0.2, max: 0.5 }),
    annualFees: finite(annualFees, 'annualFees', { min: 0, max: 0.2 }),
    goal: goal == null ? null : finite(goal, 'goal', { min: 0 }),
    seed: integer(seed, 'seed', { min: 0, max: 4294967295 }),
    allocation: normalizeAllocation(allocation)
  };
  return Object.freeze(definition);
}

function simulateOne(definition, random) {
  const months = definition.years * 12;
  let nominalValue = definition.initialAmount;
  let peak = nominalValue;
  let maxDrawdown = 0;

  for (let month = 0; month < months; month += 1) {
    let portfolioReturn = 0;
    for (const asset of definition.allocation) {
      const monthlyMean = Math.pow(1 + asset.annualReturn, 1 / 12) - 1;
      const monthlyVolatility = asset.annualVolatility / Math.sqrt(12);
      portfolioReturn += asset.weight * (monthlyMean + monthlyVolatility * normal(random));
    }
    const monthlyFee = definition.annualFees / 12;
    nominalValue = Math.max(0, nominalValue * (1 + portfolioReturn - monthlyFee) + definition.monthlyContribution);
    peak = Math.max(peak, nominalValue);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - nominalValue) / peak);
  }

  const inflationFactor = Math.pow(1 + definition.annualInflation, definition.years);
  return Object.freeze({
    finalValue: nominalValue,
    realFinalValue: nominalValue / inflationFactor,
    maxDrawdown,
    reachedGoal: definition.goal == null ? null : nominalValue >= definition.goal
  });
}

export function runMassSimulation(input) {
  const definition = input?.allocation ? createMassSimulationDefinition(input) : input;
  if (!definition || !Object.isFrozen(definition)) throw new TypeError('Une définition de simulation valide est requise.');

  const random = createSeededRandom(definition.seed);
  const results = Array.from({ length: definition.portfolioCount }, () => simulateOne(definition, random));
  const finalValues = results.map(result => result.finalValue).sort((a, b) => a - b);
  const realValues = results.map(result => result.realFinalValue).sort((a, b) => a - b);
  const drawdowns = results.map(result => result.maxDrawdown).sort((a, b) => a - b);
  const contributed = definition.initialAmount + definition.monthlyContribution * definition.years * 12;
  const goalHits = definition.goal == null ? null : results.filter(result => result.reachedGoal).length;

  return Object.freeze({
    definition,
    summary: Object.freeze({
      portfolioCount: definition.portfolioCount,
      contributed,
      nominal: Object.freeze({
        p05: percentile(finalValues, 0.05),
        p25: percentile(finalValues, 0.25),
        median: percentile(finalValues, 0.5),
        p75: percentile(finalValues, 0.75),
        p95: percentile(finalValues, 0.95),
        minimum: finalValues[0],
        maximum: finalValues[finalValues.length - 1]
      }),
      realMedian: percentile(realValues, 0.5),
      drawdown: Object.freeze({
        median: percentile(drawdowns, 0.5),
        p95: percentile(drawdowns, 0.95),
        maximum: drawdowns[drawdowns.length - 1]
      }),
      goalProbability: goalHits == null ? null : goalHits / definition.portfolioCount
    }),
    methodology: Object.freeze({
      model: 'Monte-Carlo mensuel gaussien à graine reproductible',
      independenceWarning: 'Les actifs sont simulés sans matrice de corrélation dans cette première version.',
      interpretationWarning: 'Les résultats décrivent les hypothèses saisies et ne prédisent pas les marchés.'
    })
  });
}

export function buildLeynorLabInterpretation(report) {
  if (!report?.summary || !report?.definition) throw new TypeError('Un rapport de simulation valide est requis.');
  const { summary, definition } = report;
  const probability = summary.goalProbability == null ? null : Math.round(summary.goalProbability * 100);
  const riskLabel = summary.drawdown.p95 >= 0.5 ? 'très élevé' : summary.drawdown.p95 >= 0.3 ? 'élevé' : summary.drawdown.p95 >= 0.15 ? 'modéré' : 'contenu';
  const observations = [
    `La médiane nominale atteint ${Math.round(summary.nominal.median)} après ${definition.years} ans.`,
    `Le scénario défavorable à 5 % termine autour de ${Math.round(summary.nominal.p05)}.`,
    `Le drawdown observé au 95e percentile est de ${Math.round(summary.drawdown.p95 * 100)} %, soit un risque ${riskLabel}.`,
    `La médiane corrigée de l’inflation est de ${Math.round(summary.realMedian)}.`
  ];
  if (probability != null) observations.push(`La probabilité simulée d’atteindre l’objectif est de ${probability} %.`);

  return Object.freeze({
    title: 'Analyse LEYNOR — Laboratoire Premium',
    observations: Object.freeze(observations),
    limits: Object.freeze([
      report.methodology.independenceWarning,
      report.methodology.interpretationWarning,
      'Les rendements, volatilités, frais et inflation doivent être justifiés avant toute interprétation.'
    ]),
    nextTests: Object.freeze([
      'Comparer au moins trois allocations avec la même graine.',
      'Tester un scénario de crise et un scénario de stagnation.',
      'Vérifier la sensibilité aux frais et à l’inflation.'
    ])
  });
}

export { MAX_PORTFOLIOS, MAX_YEARS };
