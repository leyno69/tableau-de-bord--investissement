import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createAcceleratedHistoricalProtocol,
  createAcceleratedHistoricalWindowRegistry,
  assessAcceleratedHistoricalLaunch
} from '../../validation/portfolioAcceleratedHistoricalCampaign.js';
import { assessLicensedBeginnerValidationReadiness } from '../../validation/licensedValidationReadiness.js';

const ENGINE_COMMIT = '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9';
const REGISTERED_AT = '2026-08-07T21:12:47Z';

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
  const dependenceAudit = null;
  const launch = assessAcceleratedHistoricalLaunch({ protocol, windowRegistry, sourceReadiness, dependenceAudit });
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
