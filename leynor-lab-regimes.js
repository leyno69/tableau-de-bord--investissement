export const MARKET_REGIMES = Object.freeze({
  croissance: Object.freeze({ label: 'Croissance', returnShift: 0.02, volatilityMultiplier: 0.85 }),
  stagnation: Object.freeze({ label: 'Stagnation', returnShift: -0.03, volatilityMultiplier: 1.05 }),
  inflation: Object.freeze({ label: 'Inflation élevée', returnShift: -0.015, volatilityMultiplier: 1.2 }),
  crise: Object.freeze({ label: 'Crise', returnShift: -0.12, volatilityMultiplier: 1.8 }),
  reprise: Object.freeze({ label: 'Reprise', returnShift: 0.05, volatilityMultiplier: 1.25 })
});

export function normalizeRegimePlan(plan = []) {
  if (!Array.isArray(plan) || plan.length === 0) return Object.freeze([{ regime: 'croissance', months: Infinity }]);
  return Object.freeze(plan.map((item, index) => {
    const regime = String(item.regime || '').trim();
    if (!MARKET_REGIMES[regime]) throw new TypeError(`Régime inconnu à l’index ${index}.`);
    const months = item.months === Infinity ? Infinity : Math.floor(Number(item.months));
    if (!(months > 0)) throw new TypeError(`Durée de régime invalide à l’index ${index}.`);
    return Object.freeze({ regime, months });
  }));
}

export function regimeAtMonth(plan, month) {
  let cursor = 0;
  for (const item of plan) {
    if (item.months === Infinity || month < cursor + item.months) return MARKET_REGIMES[item.regime];
    cursor += item.months;
  }
  return MARKET_REGIMES[plan.at(-1).regime];
}

export function buildCorrelationMatrix(size, correlation = 0.35) {
  const n = Math.floor(Number(size));
  const rho = Number(correlation);
  if (!(n > 0) || !Number.isFinite(rho) || rho < 0 || rho >= 1) throw new TypeError('Paramètres de corrélation invalides.');
  return Object.freeze(Array.from({ length: n }, (_, row) => Object.freeze(Array.from({ length: n }, (_, col) => row === col ? 1 : rho))));
}

export function cholesky(matrix) {
  const n = matrix.length;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i][j];
      for (let k = 0; k < j; k += 1) sum -= lower[i][k] * lower[j][k];
      if (i === j) {
        if (sum <= 0) throw new RangeError('La matrice de corrélation doit être définie positive.');
        lower[i][j] = Math.sqrt(sum);
      } else lower[i][j] = sum / lower[j][j];
    }
  }
  return Object.freeze(lower.map(row => Object.freeze(row)));
}
