import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createAcceleratedHistoricalProtocol,
  createAcceleratedHistoricalWindowRegistry,
  assessAcceleratedHistoricalLaunch
} from '../../validation/portfolioAcceleratedHistoricalCampaign.js';
import { createAcceleratedHistoricalDependenceMethod } from '../../validation/portfolioAcceleratedHistoricalDependenceAudit.js';
import { createAcceleratedHistoricalMetadataSelectionMethod } from '../../validation/portfolioAcceleratedHistoricalMetadataSeal.js';
import { createAcceleratedHistoricalValueGateMethod } from '../../validation/portfolioAcceleratedHistoricalValueGate.js';
import { assessLicensedBeginnerValidationReadiness } from '../../validation/licensedValidationReadiness.js';

const ENGINE_COMMIT = '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9';
const REGISTERED_AT = '2026-08-07T21:12:47Z';
const DEPENDENCE_METHOD_REGISTERED_AT = '2026-08-07T21:29:06Z';
export const METADATA_SELECTION_METHOD_REGISTERED_AT = '2026-08-07T21:48:59Z';
export const VALUE_GATE_METHOD_REGISTERED_AT = '2026-08-07T22:15:01Z';

const PREVIOUSLY_INSPECTED_INTERVALS = Object.freeze([
  Object.freeze({ evidenceId: 'scientific-drawdown-diagnostics-v2', startDate: '2014-06-02', endDate: '2023-12-29' }),
  Object.freeze({ evidenceId: 'portfolio-probability-calibration-v1', startDate: '2018-01-01', endDate: '2024-01-01' }),
  Object.freeze({ evidenceId: 'beginner-proxy-regime-windows-v1', startDate: '2015-01-02', endDate: '2023-12-29' })
]);

const ASSUMPTIONS = Object.freeze({
  targetClaim: 'twelve-month-probability-final-value-greater-than-initial-value',
  returnFrequency: 'monthly',
  estimationRule: 'mean-and-variance-from-observations-available-before-origin',
  simulationDistribution: 'unchanged-production-gaussian-monthly',
  simulationPathsPerForecast: 5000,
  benchmark: 'dynamic-point-in-time-base-rate',
  primaryScore: 'brier-score',
  comparisonUnit: 'paired-origin-loss-difference',
  windowSelectionRule: 'metadata-only-oldest-first-non-overlapping-12-month',
  uncertaintyRule: 'dependence-aware-preregistered-method-required',
  historicalOutcomeNovelty: 'must-be-audited-against-registered-evidence',
  positiveDecisionAuthority: 'retrospective-support-only',
  negativeDecisionAuthority: 'may-reject-after-independent-audit'
});

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function prepareAcceleratedHistoricalCampaign() {
  const protocol = createAcceleratedHistoricalProtocol({
    campaignId: 'portfolio-probability-accelerated-historical-v1',
    protocolVersion: '1.0.0',
    registeredAt: REGISTERED_AT,
    engineCommit: ENGINE_COMMIT,
    assumptionsFingerprint: fingerprint(ASSUMPTIONS),
    horizonMonths: 12,
    simulationPathsPerForecast: ASSUMPTIONS.simulationPathsPerForecast,
    score: ASSUMPTIONS.primaryScore,
    benchmark: ASSUMPTIONS.benchmark,
    sourceTrack: 'exact-licensed-eur',
    windowSelectionRule: ASSUMPTIONS.windowSelectionRule,
    previouslyInspectedIntervals: PREVIOUSLY_INSPECTED_INTERVALS,
    exactLicensedDataRequired: true,
    recalibrationBeforeDecisionForbidden: true,
    developmentFallbackForbidden: true,
    positiveDecisionAuthority: ASSUMPTIONS.positiveDecisionAuthority,
    negativeDecisionAuthority: ASSUMPTIONS.negativeDecisionAuthority,
    primaryFalsificationRule: 'paired-brier-delta-ci95-lower-above-zero',
    uncertaintyRule: ASSUMPTIONS.uncertaintyRule
  });
  const sourceReadiness = assessLicensedBeginnerValidationReadiness();
  const windowRegistry = createAcceleratedHistoricalWindowRegistry(protocol, []);
  const dependenceMethod = createAcceleratedHistoricalDependenceMethod({
    auditId: 'portfolio-probability-accelerated-historical-dependence-v1',
    campaignId: protocol.campaignId,
    registeredAt: DEPENDENCE_METHOD_REGISTERED_AT,
    protocolFingerprint: protocol.fingerprint,
    statistic: 'mean-paired-brier-loss-delta',
    resamplingMethod: 'circular-moving-block-bootstrap',
    blockLengthRule: 'ceil-n-power-one-fifth',
    blockLengthSensitivityOffsets: [-1, 0, 1],
    confidenceLevel: 0.95,
    intervalType: 'basic-bootstrap-two-sided-envelope',
    bootstrapReplicates: 50000,
    bootstrapSeed: 20260807,
    minimumWindowCount: 12,
    chronologicalOrderRequired: true,
    returnValuesAccessibleAtLock: false,
    positiveDecisionAuthority: 'retrospective-support-only',
    negativeDecisionAuthority: 'may-reject-after-bound-dependence-audit',
    references: [
      'https://doi.org/10.1214/aos/1176347265',
      'https://doi.org/10.1093/biomet/82.3.561'
    ]
  });
  const metadataSelectionMethod = createAcceleratedHistoricalMetadataSelectionMethod({
    methodId: 'portfolio-probability-accelerated-metadata-selection-v1',
    methodVersion: '1.0.0',
    registeredAt: METADATA_SELECTION_METHOD_REGISTERED_AT,
    protocolFingerprint: protocol.fingerprint,
    requiredSeriesIds: ['paej', 'worldProxy'],
    commonCoverageRule: 'intersection-of-declared-coverage',
    minimumTrainingMonths: 36,
    horizonMonths: 12,
    strideMonths: 12,
    originAlignmentRule: 'first-full-month-after-common-start-plus-training',
    returnValuesAccessibleAtLock: false,
    amendmentReason: 'figer avant données le minimum de 36 mois déjà appliqué par la campagne de référence'
  });
  const licensedInputGateMethod = createAcceleratedHistoricalValueGateMethod({
    registeredAt: VALUE_GATE_METHOD_REGISTERED_AT,
    protocolFingerprint: protocol.fingerprint,
    returnValuesAccessibleAtLock: false
  });
  const dependenceAudit = null;
  const launch = assessAcceleratedHistoricalLaunch({ protocol, windowRegistry, sourceReadiness, dependenceMethod, dependenceAudit });
  return Object.freeze({
    schemaVersion: 1,
    experimentId: protocol.campaignId,
    status: launch.status,
    registeredAt: REGISTERED_AT,
    protocol,
    assumptions: ASSUMPTIONS,
    previouslyInspectedIntervals: PREVIOUSLY_INSPECTED_INTERVALS,
    sourceReadiness,
    windowRegistry,
    dependenceMethod,
    metadataSelectionMethod,
    licensedInputGateMethod,
    metadataSeal: null,
    dependenceAudit,
    launch,
    results: Object.freeze([]),
    engineModified: false
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = prepareAcceleratedHistoricalCampaign();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/portfolio-probability-accelerated-historical-v1-launch.json', `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}
