function finiteSeries(values, field) {
  if (!Array.isArray(values) || values.length < 3) throw new TypeError(`${field} doit contenir au moins 3 observations.`);
  return values.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${field}[${index}] doit être fini.`);
    return number;
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values) {
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}

function sampleStd(values) {
  return Math.sqrt(sampleVariance(values));
}

function quantile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function pearsonCorrelation(leftInput, rightInput) {
  const left = finiteSeries(leftInput, 'left');
  const right = finiteSeries(rightInput, 'right');
  if (left.length !== right.length) throw new RangeError('left et right doivent avoir la même longueur.');
  const lm = mean(left);
  const rm = mean(right);
  let covariance = 0;
  let leftSq = 0;
  let rightSq = 0;
  for (let i = 0; i < left.length; i += 1) {
    const ld = left[i] - lm;
    const rd = right[i] - rm;
    covariance += ld * rd;
    leftSq += ld ** 2;
    rightSq += rd ** 2;
  }
  const denominator = Math.sqrt(leftSq * rightSq);
  return denominator === 0 ? null : covariance / denominator;
}

export function lagOneSquaredReturnCorrelation(input) {
  const values = finiteSeries(input, 'returns');
  const squared = values.map(value => value ** 2);
  return pearsonCorrelation(squared.slice(0, -1), squared.slice(1));
}

export function describeReturnDistribution(input) {
  const values = finiteSeries(input, 'returns');
  const m = mean(values);
  const std = sampleStd(values);
  const sorted = [...values].sort((a, b) => a - b);
  const centered = values.map(value => value - m);
  const n = values.length;
  const skewness = std === 0 ? 0 : (n / ((n - 1) * (n - 2))) * centered.reduce((sum, value) => sum + (value / std) ** 3, 0);
  const excessKurtosis = std === 0 || n < 4
    ? 0
    : ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * centered.reduce((sum, value) => sum + (value / std) ** 4, 0)
      - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  const empiricalP01 = quantile(sorted, 0.01);
  const empiricalP05 = quantile(sorted, 0.05);
  const normalP01Approx = m - 2.326347874 * std;
  const normalP05Approx = m - 1.644853627 * std;
  return Object.freeze({
    observationCount: n,
    mean: m,
    standardDeviation: std,
    skewness,
    excessKurtosis,
    empiricalP01,
    empiricalP05,
    normalP01Approx,
    normalP05Approx,
    downsideTailGapP01: empiricalP01 - normalP01Approx,
    downsideTailGapP05: empiricalP05 - normalP05Approx,
    squaredReturnLag1Correlation: lagOneSquaredReturnCorrelation(values)
  });
}

export function diagnoseJointMarketRisk({ worldReturns, asiaReturns }) {
  const world = finiteSeries(worldReturns, 'worldReturns');
  const asia = finiteSeries(asiaReturns, 'asiaReturns');
  if (world.length !== asia.length) throw new RangeError('Les séries doivent avoir la même longueur.');
  const correlation = pearsonCorrelation(world, asia);
  const downsidePairs = world.map((value, index) => ({ world: value, asia: asia[index] })).filter(pair => pair.world < 0 && pair.asia < 0);
  return Object.freeze({
    world: describeReturnDistribution(world),
    asia: describeReturnDistribution(asia),
    contemporaneousCorrelation: correlation,
    jointNegativeShare: downsidePairs.length / world.length,
    interpretation: Object.freeze({
      gaussianAssumptionStressors: Object.freeze([
        'excess-kurtosis',
        'negative-skewness',
        'volatility-clustering',
        'cross-asset-dependence'
      ]),
      statement: 'Ces diagnostics servent à tester les hypothèses du moteur. Ils ne constituent pas à eux seuls une calibration ni une preuve causale.'
    })
  });
}
