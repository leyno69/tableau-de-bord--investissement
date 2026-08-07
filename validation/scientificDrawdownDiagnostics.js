function finite(values, field = 'values', minimum = 2) {
  if (!Array.isArray(values) || values.length < minimum) throw new TypeError(`${field} doit contenir au moins ${minimum} observations.`);
  return values.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${field}[${index}] doit être fini.`);
    return number;
  });
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values, average = mean(values)) { return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); }
function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position); const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - position) + sorted[upper] * (position - lower);
}
function correlation(left, right) {
  if (left.length !== right.length || left.length < 3) return null;
  const lm = mean(left); const rm = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - lm) * (right[index] - rm), 0);
  const denominator = Math.sqrt(left.reduce((sum, value) => sum + (value - lm) ** 2, 0) * right.reduce((sum, value) => sum + (value - rm) ** 2, 0));
  return denominator === 0 ? null : numerator / denominator;
}

export function describeDistribution(input) {
  const values = finite(input, 'returns', 4); const sorted = [...values].sort((a, b) => a - b);
  const average = mean(values); const sampleVariance = variance(values, average); const volatility = Math.sqrt(sampleVariance); const n = values.length;
  const standardized = volatility === 0 ? values.map(() => 0) : values.map(value => (value - average) / volatility);
  const skewness = volatility === 0 ? 0 : (n / ((n - 1) * (n - 2))) * standardized.reduce((sum, value) => sum + value ** 3, 0);
  const excessKurtosis = volatility === 0 ? 0 : (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * standardized.reduce((sum, value) => sum + value ** 4, 0) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return Object.freeze({
    observationCount: n, mean: average, median: quantile(sorted, 0.5), variance: sampleVariance, volatility, skewness, excessKurtosis,
    quantiles: Object.freeze({ p001: quantile(sorted, 0.001), p01: quantile(sorted, 0.01), p05: quantile(sorted, 0.05), p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75), p95: quantile(sorted, 0.95), p99: quantile(sorted, 0.99), p999: quantile(sorted, 0.999) }),
    extremes: Object.freeze({ minimum: sorted[0], maximum: sorted.at(-1), belowMinus2Sigma: standardized.filter(value => value < -2).length, belowMinus3Sigma: standardized.filter(value => value < -3).length, above2Sigma: standardized.filter(value => value > 2).length, above3Sigma: standardized.filter(value => value > 3).length })
  });
}

export function analyzeDrawdownEpisodes(inputValues) {
  const values = finite(inputValues, 'values', 2);
  let peak = values[0]; let peakIndex = 0; let active = null; const episodes = [];
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value >= peak) {
      if (active) episodes.push(Object.freeze({ ...active, recoveryIndex: index, recoveryDuration: index - active.troughIndex, totalDuration: index - active.peakIndex, recovered: true }));
      peak = value; peakIndex = index; active = null; continue;
    }
    const depth = (peak - value) / peak;
    if (!active) active = { peakIndex, troughIndex: index, depth };
    else if (depth > active.depth) active = { ...active, troughIndex: index, depth };
  }
  if (active) episodes.push(Object.freeze({ ...active, recoveryIndex: null, recoveryDuration: null, totalDuration: values.length - 1 - active.peakIndex, recovered: false }));
  const depths = episodes.map(episode => episode.depth).sort((a, b) => a - b);
  const durations = episodes.map(episode => episode.totalDuration).sort((a, b) => a - b);
  const recoveries = episodes.filter(episode => episode.recovered).map(episode => episode.recoveryDuration).sort((a, b) => a - b);
  return Object.freeze({ episodeCount: episodes.length, frequencyPerObservation: episodes.length / (values.length - 1), maximumDepth: depths.at(-1) ?? 0, medianDepth: depths.length ? quantile(depths, 0.5) : 0, maximumDuration: durations.at(-1) ?? 0, medianDuration: durations.length ? quantile(durations, 0.5) : 0, recoveredCount: recoveries.length, unrecoveredCount: episodes.length - recoveries.length, medianRecoveryDuration: recoveries.length ? quantile(recoveries, 0.5) : null, maximumRecoveryDuration: recoveries.at(-1) ?? null, episodes: Object.freeze(episodes) });
}

export function analyzeDependence(leftInput, rightInput, marketInput, rollingWindow = 63) {
  const left = finite(leftInput, 'left', 4); const right = finite(rightInput, 'right', 4); const market = finite(marketInput, 'market', 4);
  if (left.length !== right.length || left.length !== market.length) throw new RangeError('Les séries de dépendance doivent être alignées.');
  const select = predicate => { const l = []; const r = []; market.forEach((value, index) => { if (predicate(value)) { l.push(left[index]); r.push(right[index]); } }); return correlation(l, r); };
  const rolling = [];
  for (let end = rollingWindow; end <= left.length; end += 1) rolling.push(correlation(left.slice(end - rollingWindow, end), right.slice(end - rollingWindow, end)));
  const validRolling = rolling.filter(Number.isFinite);
  return Object.freeze({ unconditional: correlation(left, right), downMarket: select(value => value < 0), upMarket: select(value => value >= 0), severeDownMarket: select(value => value <= -0.01), rollingWindow, rolling: Object.freeze(rolling), rollingRange: Object.freeze({ minimum: validRolling.length ? Math.min(...validRolling) : null, maximum: validRolling.length ? Math.max(...validRolling) : null, mean: validRolling.length ? mean(validRolling) : null }) });
}

export function analyzeVolatilityPersistence(input, regimeWindow = 21) {
  const returns = finite(input, 'returns', regimeWindow + 2); const squared = returns.map(value => value ** 2); const absolute = returns.map(Math.abs);
  const lag = values => correlation(values.slice(0, -1), values.slice(1));
  const rollingVolatility = [];
  for (let end = regimeWindow; end <= returns.length; end += 1) rollingVolatility.push(Math.sqrt(variance(returns.slice(end - regimeWindow, end))));
  const sortedVolatility = [...rollingVolatility].sort((a, b) => a - b); const lowThreshold = quantile(sortedVolatility, 1 / 3); const highThreshold = quantile(sortedVolatility, 2 / 3);
  const regimes = { low: [], medium: [], high: [] };
  rollingVolatility.forEach((value, index) => regimes[value <= lowThreshold ? 'low' : value >= highThreshold ? 'high' : 'medium'].push(returns[index + regimeWindow - 1]));
  return Object.freeze({ squaredReturnLag1Correlation: lag(squared), absoluteReturnLag1Correlation: lag(absolute), regimeWindow, rollingVolatility: Object.freeze(rollingVolatility), thresholds: Object.freeze({ low: lowThreshold, high: highThreshold }), regimes: Object.freeze(Object.fromEntries(Object.entries(regimes).map(([key, values]) => [key, Object.freeze({ observationCount: values.length, volatility: values.length > 1 ? Math.sqrt(variance(values)) : null })]))) });
}
