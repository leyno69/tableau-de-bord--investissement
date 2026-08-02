const MAX_PORTFOLIOS = 10000;
const MAX_YEARS = 50;
const EVENT_TYPES = Object.freeze(['withdrawal', 'contribution_pause', 'contribution_resume']);

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
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function normalizeAllocation(allocation) {
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

function normalizeEvents(events, totalMonths) {
  if (!Array.isArray(events)) throw new TypeError('events doit être un tableau.');
  const normalized = events.map((event, index) => {
    const type = String(event?.type || '');
    if (!EVENT_TYPES.includes(type)) throw new RangeError(`events[${index}].type est inconnu.`);
    const month = integer(event.month, `events[${index}].month`, { min: 1, max: totalMonths });
    const amount = type === 'withdrawal'
      ? finite(event.amount, `events[${index}].amount`, { min: 0 })
      : null;
    return Object.freeze({ type, month, amount });
  });
  return Object.freeze([...normalized].sort((a, b) => a.month - b.month));
}

export function createResilienceDefinition({
  portfolioCount = 1000,
  years = 20,
  initialAmount = 10000,
  monthlyContribution = 100,
  annualInflation = 0.02,
  annualFees = 0.0025,
  goal = null,
  seed = 42,
  allocation,
  events = []
} = {}) {
  const normalizedYears = integer(years, 'years', { min: 1, max: MAX_YEARS });
  return Object.freeze({
    portfolioCount: integer(portfolioCount, 'portfolioCount', { min: 1, max: MAX_PORTFOLIOS }),
    years: normalizedYears,
    initialAmount: finite(initialAmount, 'initialAmount', { min: 0 }),
    monthlyContribution: finite(monthlyContribution, 'monthlyContribution', { min: 0 }),
    annualInflation: finite(annualInflation, 'annualInflation', { min: -0.2, max: 0.5 }),
    annualFees: finite(annualFees, 'annualFees', { min: 0, max: 0.2 }),
    goal: goal == null ? null : finite(goal, 'goal', { min: 0 }),
    seed: integer(seed, 'seed', { min: 0, max: 4294967295 }),
    allocation: normalizeAllocation(allocation),
    events: normalizeEvents(events, normalizedYears * 12)
  });
}

function simulateOne(definition, random) {
  const eventsByMonth = new Map();
  for (const event of definition.events) {
    const list = eventsByMonth.get(event.month) || [];
    list.push(event);
    eventsByMonth.set(event.month, list);
  }

  let nominalValue = definition.initialAmount;
  let peak = nominalValue;
  let maxDrawdown = 0;
  let contributionActive = true;
  let forcedWithdrawals = 0;
  let missedContributions = 0;

  for (let month = 1; month <= definition.years * 12; month += 1) {
    for (const event of eventsByMonth.get(month) || []) {
      if (event.type === 'withdrawal') {
        const actual = Math.min(nominalValue, event.amount);
        nominalValue -= actual;
        forcedWithdrawals += actual;
      } else if (event.type === 'contribution_pause') {
        contributionActive = false;
      } else if (event.type === 'contribution_resume') {
        contributionActive = true;
      }
    }

    let portfolioReturn = 0;
    for (const asset of definition.allocation) {
      const monthlyMean = Math.pow(1 + asset.annualReturn, 1 / 12) - 1;
      const monthlyVolatility = asset.annualVolatility / Math.sqrt(12);
      portfolioReturn += asset.weight * (monthlyMean + monthlyVolatility * normal(random));
    }
    const contribution = contributionActive ? definition.monthlyContribution : 0;
    if (!contributionActive) missedContributions += definition.monthlyContribution;
    nominalValue = Math.max(0, nominalValue * (1 + portfolioReturn - definition.annualFees / 12) + contribution);
    peak = Math.max(peak, nominalValue);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - nominalValue) / peak);
  }

  return Object.freeze({
    finalValue: nominalValue,
    realFinalValue: nominalValue / Math.pow(1 + definition.annualInflation, definition.years),
    maxDrawdown,
    forcedWithdrawals,
    missedContributions,
    reachedGoal: definition.goal == null ? null : nominalValue >= definition.goal
  });
}

export function runResilienceSimulation(input) {
  const definition = input?.allocation && !Object.isFrozen(input) ? createResilienceDefinition(input) : input;
  if (!definition || !Object.isFrozen(definition)) throw new TypeError('Une définition de résilience valide est requise.');
  const random = createSeededRandom(definition.seed);
  const results = Array.from({ length: definition.portfolioCount }, () => simulateOne(definition, random));
  const finalValues = results.map(item => item.finalValue).sort((a, b) => a - b);
  const realValues = results.map(item => item.realFinalValue).sort((a, b) => a - b);
  const drawdowns = results.map(item => item.maxDrawdown).sort((a, b) => a - b);
  const goalHits = definition.goal == null ? null : results.filter(item => item.reachedGoal).length;

  return Object.freeze({
    definition,
    summary: Object.freeze({
      nominal: Object.freeze({ p05: percentile(finalValues, 0.05), median: percentile(finalValues, 0.5), p95: percentile(finalValues, 0.95) }),
      realMedian: percentile(realValues, 0.5),
      drawdown: Object.freeze({ median: percentile(drawdowns, 0.5), p95: percentile(drawdowns, 0.95) }),
      goalProbability: goalHits == null ? null : goalHits / definition.portfolioCount,
      plannedWithdrawals: definition.events.filter(event => event.type === 'withdrawal').reduce((sum, event) => sum + event.amount, 0),
      pausedMonths: results[0]?.missedContributions / (definition.monthlyContribution || 1) || 0
    }),
    methodology: Object.freeze({
      model: 'Monte-Carlo mensuel gaussien à événements datés et graine reproductible',
      statement: 'Les retraits et interruptions sont appliqués au mois indiqué avant le rendement et la contribution du mois.',
      limitation: 'Les événements sont des scénarios comparatifs définis par l’utilisateur ; ils ne prédisent ni revenus ni dépenses futurs.'
    })
  });
}

export { EVENT_TYPES, MAX_PORTFOLIOS, MAX_YEARS };
