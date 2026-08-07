function finiteSeries(values, field) {
  if (!Array.isArray(values) || values.length < 3) throw new TypeError(`${field} doit contenir au moins trois observations.`);
  return values.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${field}[${index}] doit être fini.`);
    return number;
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values, average = mean(values)) {
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

function sampleStd(values, average = mean(values)) {
  return Math.sqrt(sampleVariance(values, average));
}

function skewness(values, average, std) {
  if (std === 0) return 0;
  const n = values.length;
  const m3 = values.reduce((sum, value) => sum + ((value - average) / std) ** 3, 0);
  return n > 2 ? (n / ((n - 1) * (n - 2))) * m3 : 0;
}

function excessKurtosis(values, average, std) {
  if (std === 0 || values.length < 4) return 0;
  const n = values.length;
  const sum4 = values.reduce((sum, value) => sum + ((value - average) / std) ** 4, 0);
  const first = (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum4;
  const second = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return first - second;
}

function lagOneCorrelation(values) {
  if (values.length < 4) return null;
  const left = values.slice(0, -1);
  const right = values.slice(1);
  return pearsonCorrelation(left, right);
}

export function pearsonCorrelation(leftInput, rightInput) {
  const left = finiteSeries(leftInput, 'left');
  const right = finiteSeries(rightInput, 'right');
  if (left.length !== right.length) throw new RangeError('Les séries doivent avoir la même longueur.');
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftScale = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightScale = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  if (leftScale === 0 || rightScale === 0) return null;
  return numerator / (leftScale * rightScale);
}

export function maxDrawdownFromValues(inputValues) {
  const values = finiteSeries(inputValues, 'values');
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
  }
  return maxDrawdown;
}

export function describeReturnTailRisk(inputValues, { referenceMonthlyMean = 0, referenceMonthlyVolatility } = {}) {
  const values = finiteSeries(inputValues, 'returns');
  const average = mean(values);
  const std = sampleStd(values, average);
  const refVol = Number(referenceMonthlyVolatility);
  if (!Number.isFinite(refVol) || refVol <= 0) throw new TypeError('referenceMonthlyVolatility doit être > 0.');
  const refMean = Number(referenceMonthlyMean);
  if (!Number.isFinite(refMean)) throw new TypeError('referenceMonthlyMean doit être fini.');
  const standardized = values.map(value => (value - refMean) / refVol);
  return Object.freeze({
    observationCount: values.length,
    mean: average,
    sampleVolatility: std,
    skewness: skewness(values, average, std),
    excessKurtosis: excessKurtosis(values, average, std),
    worstReturn: Math.min(...values),
    bestReturn: Math.max(...values),
    beyond2SigmaCount: standardized.filter(value => Math.abs(value) > 2).length,
    beyond3SigmaCount: standardized.filter(value => Math.abs(value) > 3).length,
    negativeBeyond2SigmaCount: standardized.filter(value => value < -2).length,
    absoluteReturnLag1Correlation: lagOneCorrelation(values.map(Math.abs))
  });
}

export function classifyDrawdownAgainstSimulation(drawdownMagnitude, simulation) {
  const observed = Number(drawdownMagnitude);
  const median = Number(simulation?.median);
  const p95 = Number(simulation?.p95);
  const maximum = Number(simulation?.maximum);
  if (![observed, median, p95, maximum].every(Number.isFinite)) throw new TypeError('Drawdown et bornes de simulation doivent être finis.');
  if (observed < 0 || median < 0 || p95 < median || maximum < p95) throw new RangeError('Bornes de drawdown invalides.');
  const band = observed <= median ? 'at-or-below-median' : observed <= p95 ? 'median-p95' : observed <= maximum ? 'p95-maximum' : 'above-maximum';
  return Object.freeze({ observed, median, p95, maximum, band, adverseEvidence: observed > p95 });
}
