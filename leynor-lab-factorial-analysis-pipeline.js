import { runFactorialSensitivity } from './leynor-lab-factorial-sensitivity-engine.js';
import {
  calculateTwoFactorInteraction,
  rankInteractionAnalyses,
  recommendAdditionalSeeds,
  summarizeCellStability,
} from './leynor-lab-factorial-interaction-analysis.js';

export const FACTORIAL_CAMPAIGN_001_CONFIG = Object.freeze({
  campaignId: 'factorial-sensitivity-001',
  behaviors: Object.freeze(['regular', 'interruption']),
  reserveMonths: Object.freeze([0, 6]),
  lineCounts: Object.freeze([5, 15]),
  assetVolatilities: Object.freeze([0.12, 0.2]),
  correlations: Object.freeze([0.1, 0.35, 0.75]),
  shockIntensities: Object.freeze([0, 1800, 3600, 7200]),
  horizons: Object.freeze([10, 20, 30]),
  seeds: Object.freeze([101, 202, 303, 404, 505]),
  pathsPerReplication: 250,
  assumptions: Object.freeze({
    initialCapital: 10000,
    monthlyContribution: 300,
    annualGeometricReturn: 0.05,
  }),
  limitations: Object.freeze([
    'synthetic lognormal returns',
    'constant equicorrelation',
    'no fees, taxes or inflation',
    'no historical multi-regime calibration',
  ]),
});

const CELL_FACTORS = Object.freeze([
  'behavior',
  'reserveMonths',
  'lineCount',
  'assetVolatility',
  'correlation',
  'shockIntensity',
  'years',
]);

export const PRIORITY_INTERACTIONS = Object.freeze([
  Object.freeze({ factorA: 'behavior', lowA: 'regular', highA: 'interruption', factorB: 'reserveMonths', lowB: 0, highB: 6 }),
  Object.freeze({ factorA: 'behavior', lowA: 'regular', highA: 'interruption', factorB: 'shockIntensity', lowB: 0, highB: 7200 }),
  Object.freeze({ factorA: 'reserveMonths', lowA: 0, highA: 6, factorB: 'shockIntensity', lowB: 0, highB: 7200 }),
  Object.freeze({ factorA: 'correlation', lowA: 0.1, highA: 0.75, factorB: 'assetVolatility', lowB: 0.12, highB: 0.2 }),
  Object.freeze({ factorA: 'correlation', lowA: 0.1, highA: 0.75, factorB: 'lineCount', lowB: 5, highB: 15 }),
  Object.freeze({ factorA: 'years', lowA: 10, highA: 30, factorB: 'behavior', lowB: 'regular', highB: 'interruption' }),
]);

function cellKey(row) {
  return CELL_FACTORS.map((factor) => `${factor}=${row[factor]}`).join('|');
}

export function groupReplicationsByCell(replications) {
  const groups = new Map();
  for (const row of replications) {
    const key = cellKey(row);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }
  return groups;
}

export function analyzeFactorialResult(result, options = {}) {
  if (!result || !Array.isArray(result.replications)) {
    throw new TypeError('result.replications must be an array');
  }

  const minimumSeeds = options.minimumSeeds ?? 5;
  if (!Number.isInteger(minimumSeeds) || minimumSeeds < 2) {
    throw new RangeError('minimumSeeds must be an integer greater than or equal to 2');
  }

  const groups = groupReplicationsByCell(result.replications);
  const stability = [...groups.entries()].map(([key, rows]) => {
    const summary = summarizeCellStability(rows);
    const insufficient = summary.seedCount < minimumSeeds;
    const additionalSeeds = insufficient
      ? minimumSeeds - summary.seedCount
      : recommendAdditionalSeeds(summary.relativeDispersion, summary.seedCount, options);

    return Object.freeze({
      cellKey: key,
      ...summary,
      stability: insufficient ? 'insufficient' : summary.stability,
      additionalSeeds,
    });
  });

  const interactions = rankInteractionAnalyses(
    PRIORITY_INTERACTIONS.map((specification) => calculateTwoFactorInteraction(
      result.replications,
      { ...specification, metric: 'finalMedian' },
    )),
  );

  return Object.freeze({
    campaignId: result.campaignId,
    replicationCount: result.replications.length,
    totalPaths: result.totalPaths,
    cellCount: groups.size,
    stability: Object.freeze(stability),
    interactions: Object.freeze(interactions),
    insufficientCellCount: stability.filter((row) => row.stability === 'insufficient').length,
    unstableCellCount: stability.filter((row) => row.stability === 'unstable').length,
    watchCellCount: stability.filter((row) => row.stability === 'watch').length,
    additionalSeedCount: stability.reduce((total, row) => total + row.additionalSeeds, 0),
    notice: 'Synthetic scenario analysis; not a forecast and not an IGL calibration.',
  });
}

export function runCampaign001Analysis(config = FACTORIAL_CAMPAIGN_001_CONFIG) {
  return analyzeFactorialResult(runFactorialSensitivity(config));
}
