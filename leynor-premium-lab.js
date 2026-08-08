const MAX_PORTFOLIOS = 10000;
const MAX_YEARS = 50;
const MAX_MONTHS = MAX_YEARS * 12;
const MAX_SCENARIOS = 12;

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

function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} doit être une chaîne non vide.`);
  return value.trim();
}

function createSeededRandom(seed = 1) {
  let state = Number(seed) >>> 0;
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

function normalizeSharedSimulationFields({
  portfolioCount = 1000,
  initialAmount = 10000,
  monthlyContribution = 100,
  annualInflation = 0.02,
  annualFees = 0.0025,
  goal = null,
  seed = 42,
  allocation
} = {}) {
  return {
    portfolioCount: integer(portfolioCount, 'portfolioCount', { min: 1, max: MAX_PORTFOLIOS }),
    initialAmount: finite(initialAmount, 'initialAmount', { min: 0 }),
    monthlyContribution: finite(monthlyContribution, 'monthlyContribution', { min: 0 }),
    annualInflation: finite(annualInflation, 'annualInflation', { min: -0.2, max: 0.5 }),
    annualFees: finite(annualFees, 'annualFees', { min: 0, max: 0.2 }),
    goal: goal == null ? null : finite(goal, 'goal', { min: 0 }),
    seed: integer(seed, 'seed', { min: 0, max: 4294967295 }),
    allocation: normalizeAllocation(allocation)
  };
}

export function createMassSimulationDefinition({ years = 20, ...rest } = {}) {
  return Object.freeze({
    ...normalizeSharedSimulationFields(rest),
    years: integer(years, 'years', { min: 1, max: MAX_YEARS })
  });
}

export function createMassSimulationDurationDefinition({ months = 3, ...rest } = {}) {
  const durationMonths = integer(months, 'months', { min: 1, max: MAX_MONTHS });
  return Object.freeze({
    ...normalizeSharedSimulationFields(rest),
    durationMonths,
    durationYears: durationMonths / 12
  });
}

function simulateOneForMonths(definition, random, months, durationYears) {
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

  const inflationFactor = Math.pow(1 + definition.annualInflation, durationYears);
  return Object.freeze({
    finalValue: nominalValue,
    realFinalValue: nominalValue / inflationFactor,
    maxDrawdown,
    reachedGoal: definition.goal == null ? null : nominalValue >= definition.goal
  });
}

function buildMassSimulationReport(definition, months, durationYears) {
  const random = createSeededRandom(definition.seed);
  const results = Array.from({ length: definition.portfolioCount }, () => simulateOneForMonths(definition, random, months, durationYears));
  const finalValues = results.map(result => result.finalValue).sort((a, b) => a - b);
  const realValues = results.map(result => result.realFinalValue).sort((a, b) => a - b);
  const drawdowns = results.map(result => result.maxDrawdown).sort((a, b) => a - b);
  const contributed = definition.initialAmount + definition.monthlyContribution * months;
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
      durationMonths: months,
      independenceWarning: 'Les actifs sont simulés sans matrice de corrélation dans cette première version.',
      interpretationWarning: 'Les résultats décrivent les hypothèses saisies et ne prédisent pas les marchés.'
    })
  });
}

export function runMassSimulation(input) {
  const definition = input?.allocation ? createMassSimulationDefinition(input) : input;
  if (!definition || !Object.isFrozen(definition) || !Number.isInteger(definition.years)) throw new TypeError('Une définition de simulation annuelle valide est requise.');
  return buildMassSimulationReport(definition, definition.years * 12, definition.years);
}

export function runMassSimulationDuration(input) {
  const definition = input?.allocation ? createMassSimulationDurationDefinition(input) : input;
  if (!definition || !Object.isFrozen(definition) || !Number.isInteger(definition.durationMonths)) throw new TypeError('Une définition de simulation par durée valide est requise.');
  return buildMassSimulationReport(definition, definition.durationMonths, definition.durationYears);
}

export function createSimulationCampaign({ name = 'Campagne LEYNOR', shared, scenarios } = {}) {
  if (!Array.isArray(scenarios) || scenarios.length < 2 || scenarios.length > MAX_SCENARIOS) {
    throw new RangeError(`scenarios doit contenir entre 2 et ${MAX_SCENARIOS} scénarios.`);
  }
  const ids = new Set();
  const normalizedScenarios = scenarios.map((scenario, index) => {
    const id = requiredText(scenario?.id ?? `scenario-${index + 1}`, `scenarios[${index}].id`);
    if (ids.has(id)) throw new RangeError(`Identifiant de scénario dupliqué : ${id}.`);
    ids.add(id);
    return Object.freeze({
      id,
      label: requiredText(scenario?.label ?? id, `scenarios[${index}].label`),
      allocation: normalizeAllocation(scenario?.allocation)
    });
  });
  const base = createMassSimulationDefinition({ ...shared, allocation: normalizedScenarios[0].allocation });
  return Object.freeze({
    name: requiredText(name, 'name'),
    shared: Object.freeze({
      portfolioCount: base.portfolioCount,
      years: base.years,
      initialAmount: base.initialAmount,
      monthlyContribution: base.monthlyContribution,
      annualInflation: base.annualInflation,
      annualFees: base.annualFees,
      goal: base.goal,
      seed: base.seed
    }),
    scenarios: Object.freeze(normalizedScenarios)
  });
}

export function runSimulationCampaign(input) {
  const campaign = input?.scenarios && !Object.isFrozen(input) ? createSimulationCampaign(input) : input;
  if (!campaign || !Object.isFrozen(campaign)) throw new TypeError('Une campagne de simulation valide est requise.');
  const reports = campaign.scenarios.map(scenario => Object.freeze({
    id: scenario.id,
    label: scenario.label,
    report: runMassSimulation({ ...campaign.shared, allocation: scenario.allocation })
  }));
  return Object.freeze({
    campaign,
    reports: Object.freeze(reports),
    comparison: Object.freeze(reports.map(({ id, label, report }) => Object.freeze({
      id,
      label,
      median: report.summary.nominal.median,
      p05: report.summary.nominal.p05,
      p95: report.summary.nominal.p95,
      realMedian: report.summary.realMedian,
      drawdownP95: report.summary.drawdown.p95,
      goalProbability: report.summary.goalProbability
    }))),
    methodology: Object.freeze({
      commonSeed: campaign.shared.seed,
      // Chaque scénario appelle runMassSimulation indépendamment, qui crée
      // son propre createSeededRandom(seed) : la graine commune garantit la
      // reproductibilité de CHAQUE scénario pris isolément (mêmes entrées,
      // même sortie), pas un appariement des tirages entre scénarios. Les
      // chocs mensuels sont consommés dans l'ordre de definition.allocation ;
      // deux scénarios avec un nombre ou un ordre d'actifs différent
      // consomment donc les tirages de leur flux respectif à des positions
      // différentes, et ne bénéficient pas d'une réduction de variance par
      // tirages communs (comparaison appariée) — uniquement de la même
      // reproductibilité individuelle.
      statement: 'Chaque scénario utilise les mêmes paramètres communs et la même graine, ce qui garantit la reproductibilité de chaque scénario pris isolément — pas un appariement des tirages aléatoires entre scénarios ayant un nombre ou un ordre d’actifs différent.',
      nonRecommendation: 'La campagne compare des résultats simulés sans désigner de meilleur portefeuille ni formuler de recommandation.'
    })
  });
}

export function buildLeynorLabInterpretation(report) {
  if (!report?.summary || !report?.definition) throw new TypeError('Un rapport de simulation valide est requis.');
  const { summary, definition } = report;
  const probability = summary.goalProbability == null ? null : Math.round(summary.goalProbability * 100);
  const riskLabel = summary.drawdown.p95 >= 0.5 ? 'très élevé' : summary.drawdown.p95 >= 0.3 ? 'élevé' : summary.drawdown.p95 >= 0.15 ? 'modéré' : 'contenu';
  const durationLabel = Number.isInteger(definition.years) ? `${definition.years} ans` : `${definition.durationMonths} mois`;
  const observations = [
    `La médiane nominale atteint ${Math.round(summary.nominal.median)} après ${durationLabel}.`,
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

export { MAX_MONTHS, MAX_PORTFOLIOS, MAX_SCENARIOS, MAX_YEARS };
