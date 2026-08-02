const DEFAULT_THRESHOLDS = Object.freeze({
  stable: 0.05,
  watch: 0.1,
  minimumSeeds: 5,
  maximumSeeds: 25,
  batchSize: 5,
});

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative`);
}

function parseCellKey(cellKey) {
  return Object.fromEntries(cellKey.split('|').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 1) throw new TypeError('invalid cell key');
    const key = part.slice(0, separator);
    const raw = part.slice(separator + 1);
    const numeric = Number(raw);
    return [key, raw !== '' && Number.isFinite(numeric) ? numeric : raw];
  }));
}

function normalizedThresholds(options = {}) {
  const thresholds = {
    stable: options.stable ?? DEFAULT_THRESHOLDS.stable,
    watch: options.watch ?? DEFAULT_THRESHOLDS.watch,
    minimumSeeds: options.minimumSeeds ?? DEFAULT_THRESHOLDS.minimumSeeds,
    maximumSeeds: options.maximumSeeds ?? DEFAULT_THRESHOLDS.maximumSeeds,
    batchSize: options.batchSize ?? DEFAULT_THRESHOLDS.batchSize,
  };
  if (!(thresholds.stable > 0 && thresholds.watch >= thresholds.stable)) {
    throw new RangeError('thresholds must satisfy 0 < stable <= watch');
  }
  for (const name of ['minimumSeeds', 'maximumSeeds', 'batchSize']) {
    if (!Number.isInteger(thresholds[name]) || thresholds[name] < 1) {
      throw new RangeError(`${name} must be a positive integer`);
    }
  }
  if (thresholds.maximumSeeds < thresholds.minimumSeeds) {
    throw new RangeError('maximumSeeds must be greater than or equal to minimumSeeds');
  }
  return Object.freeze(thresholds);
}

export function classifyConvergence(relativeDispersion, seedCount, thresholds = DEFAULT_THRESHOLDS) {
  assertFiniteNonNegative(relativeDispersion, 'relativeDispersion');
  if (!Number.isInteger(seedCount) || seedCount < 1) throw new RangeError('seedCount must be a positive integer');
  if (seedCount < thresholds.minimumSeeds) return 'insufficient';
  if (relativeDispersion <= thresholds.stable) return 'stable';
  if (relativeDispersion <= thresholds.watch) return 'watch';
  return 'unstable';
}

export function requiredSeedCount(relativeDispersion, seedCount, options = DEFAULT_THRESHOLDS) {
  const thresholds = normalizedThresholds(options);
  const status = classifyConvergence(relativeDispersion, seedCount, thresholds);
  if (status === 'stable') return seedCount;
  if (status === 'insufficient') return Math.min(thresholds.maximumSeeds, thresholds.minimumSeeds);

  const target = status === 'watch' ? thresholds.stable : thresholds.watch;
  const rawEstimate = seedCount * (relativeDispersion / target) ** 2;
  const estimated = Math.ceil(Number(rawEstimate.toPrecision(12)));
  const additionalNeeded = Math.max(0, estimated - seedCount);
  const additionalBatches = Math.ceil(additionalNeeded / thresholds.batchSize);
  const batchedTarget = seedCount + additionalBatches * thresholds.batchSize;
  return Math.min(
    thresholds.maximumSeeds,
    Math.max(seedCount + thresholds.batchSize, batchedTarget),
  );
}

export function buildTargetedReplicationPlan(stabilityRows, options = {}) {
  if (!Array.isArray(stabilityRows)) throw new TypeError('stabilityRows must be an array');
  const thresholds = normalizedThresholds(options);
  const startingSeed = options.startingSeed ?? 1000;
  if (!Number.isInteger(startingSeed) || startingSeed < 0) throw new RangeError('startingSeed must be a non-negative integer');

  let nextSeed = startingSeed;
  const cells = stabilityRows.map((row) => {
    if (!row?.cellKey) throw new TypeError('each stability row requires cellKey');
    const relativeDispersion = row.relativeDispersion ?? 0;
    const seedCount = row.seedCount ?? 0;
    const status = classifyConvergence(relativeDispersion, seedCount, thresholds);
    const targetSeedCount = requiredSeedCount(relativeDispersion, seedCount, thresholds);
    const additionalSeedCount = Math.max(0, targetSeedCount - seedCount);
    const seeds = Array.from({ length: additionalSeedCount }, () => nextSeed++);
    return Object.freeze({
      cellKey: row.cellKey,
      factors: Object.freeze(parseCellKey(row.cellKey)),
      relativeDispersion,
      currentSeedCount: seedCount,
      targetSeedCount,
      additionalSeedCount,
      status,
      seeds: Object.freeze(seeds),
      stopReason: additionalSeedCount === 0 ? 'dispersion target reached' : null,
    });
  });

  const targetedCells = cells.filter((cell) => cell.additionalSeedCount > 0);
  return Object.freeze({
    thresholds,
    cellCount: cells.length,
    targetedCellCount: targetedCells.length,
    additionalReplicationCount: targetedCells.reduce((sum, cell) => sum + cell.additionalSeedCount, 0),
    cells: Object.freeze(cells),
    notice: 'Replication allocation is a statistical precision plan, not an IGL weighting rule.',
  });
}

export function evaluateReplicationStop(previous, current, options = {}) {
  const thresholds = normalizedThresholds(options);
  if (!previous || !current) throw new TypeError('previous and current summaries are required');
  const status = classifyConvergence(current.relativeDispersion, current.seedCount, thresholds);
  const dispersionImprovement = previous.relativeDispersion === 0
    ? 0
    : (previous.relativeDispersion - current.relativeDispersion) / previous.relativeDispersion;
  const effectDrift = Math.abs((current.median ?? 0) - (previous.median ?? 0)) / Math.max(1, Math.abs(previous.median ?? 0));
  const converged = status === 'stable' && effectDrift <= (options.maximumEffectDrift ?? 0.02);
  const exhausted = current.seedCount >= thresholds.maximumSeeds;
  return Object.freeze({
    status,
    dispersionImprovement,
    effectDrift,
    stop: converged || exhausted,
    reason: converged ? 'precision and effect-drift targets reached' : exhausted ? 'maximum seed budget reached' : 'continue targeted replication',
  });
}
