const DEFAULT_THRESHOLDS = Object.freeze({
  stable: 0.08,
  watch: 0.15,
});

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError('median requires at least one value');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function classifyRelativeDispersion(relativeDispersion, thresholds = DEFAULT_THRESHOLDS) {
  assertFiniteNumber(relativeDispersion, 'relativeDispersion');
  if (relativeDispersion < 0) {
    throw new RangeError('relativeDispersion must be greater than or equal to zero');
  }

  if (relativeDispersion <= thresholds.stable) return 'stable';
  if (relativeDispersion <= thresholds.watch) return 'watch';
  return 'unstable';
}

export function summarizeCellStability(cellRows, thresholds = DEFAULT_THRESHOLDS) {
  if (!Array.isArray(cellRows) || cellRows.length === 0) {
    throw new TypeError('cellRows must contain at least one row');
  }

  const values = cellRows.map((row, index) => {
    assertFiniteNumber(row.finalMedian, `cellRows[${index}].finalMedian`);
    return row.finalMedian;
  });

  const center = median(values);
  const range = Math.max(...values) - Math.min(...values);
  const relativeDispersion = center === 0 ? (range === 0 ? 0 : Infinity) : range / Math.abs(center);

  return Object.freeze({
    seedCount: values.length,
    medianFinalValue: center,
    range,
    relativeDispersion,
    stability: Number.isFinite(relativeDispersion)
      ? classifyRelativeDispersion(relativeDispersion, thresholds)
      : 'unstable',
  });
}

export function recommendAdditionalSeeds(relativeDispersion, currentSeedCount, options = {}) {
  assertFiniteNumber(relativeDispersion, 'relativeDispersion');
  assertFiniteNumber(currentSeedCount, 'currentSeedCount');

  const targetDispersion = options.targetDispersion ?? DEFAULT_THRESHOLDS.stable;
  const maximumSeeds = options.maximumSeeds ?? 25;

  if (currentSeedCount < 2 || !Number.isInteger(currentSeedCount)) {
    throw new RangeError('currentSeedCount must be an integer greater than or equal to 2');
  }
  if (relativeDispersion <= targetDispersion) return 0;

  // Monte Carlo uncertainty decreases approximately with 1/sqrt(n).
  const estimatedTotal = Math.ceil(currentSeedCount * (relativeDispersion / targetDispersion) ** 2);
  return Math.max(0, Math.min(maximumSeeds, estimatedTotal) - currentSeedCount);
}

function groupMean(rows, predicate, metric) {
  const selected = rows.filter(predicate).map((row) => row[metric]);
  if (selected.length === 0) {
    throw new Error('interaction contrast has an empty factorial cell');
  }
  selected.forEach((value, index) => assertFiniteNumber(value, `${metric}[${index}]`));
  return selected.reduce((sum, value) => sum + value, 0) / selected.length;
}

export function calculateTwoFactorInteraction(rows, specification) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError('rows must contain factorial observations');
  }

  const { factorA, lowA, highA, factorB, lowB, highB, metric = 'finalMedian' } = specification;
  if (!factorA || !factorB || factorA === factorB) {
    throw new TypeError('two distinct factor names are required');
  }

  const cell = (valueA, valueB) => groupMean(
    rows,
    (row) => row[factorA] === valueA && row[factorB] === valueB,
    metric,
  );

  const lowLow = cell(lowA, lowB);
  const highLow = cell(highA, lowB);
  const lowHigh = cell(lowA, highB);
  const highHigh = cell(highA, highB);

  const effectAWhenBLow = highLow - lowLow;
  const effectAWhenBHigh = highHigh - lowHigh;
  const interaction = effectAWhenBHigh - effectAWhenBLow;
  const scale = Math.max(Math.abs(lowLow), Math.abs(highLow), Math.abs(lowHigh), Math.abs(highHigh), 1);

  return Object.freeze({
    factorA,
    factorB,
    metric,
    cells: Object.freeze({ lowLow, highLow, lowHigh, highHigh }),
    effectAWhenBLow,
    effectAWhenBHigh,
    interaction,
    normalizedInteraction: interaction / scale,
  });
}

export function rankInteractionAnalyses(analyses) {
  if (!Array.isArray(analyses)) throw new TypeError('analyses must be an array');
  return [...analyses].sort(
    (left, right) => Math.abs(right.normalizedInteraction) - Math.abs(left.normalizedInteraction),
  );
}

export const FACTORIAL_STABILITY_THRESHOLDS = DEFAULT_THRESHOLDS;
