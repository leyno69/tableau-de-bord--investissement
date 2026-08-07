import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createProspectiveCampaignProtocol,
  createProspectiveCalendar,
  assessProspectiveCampaignLaunch
} from '../../validation/portfolioProspectiveCampaign.js';
import { assessLicensedBeginnerValidationReadiness } from '../../validation/licensedValidationReadiness.js';

const ENGINE_COMMIT = '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9';
const TARGET_ORIGINS = Object.freeze([
  '2026-10-01',
  '2027-01-01',
  '2027-04-01',
  '2027-07-01',
  '2027-10-01',
  '2028-01-01',
  '2028-04-01',
  '2028-07-01'
]);
const ASSUMPTIONS = Object.freeze({
  portfolioCohort: Object.freeze([
    Object.freeze({ id: 'defensive', world: 0.30, asia: 0.10, cash: 0.60 }),
    Object.freeze({ id: 'beginner', world: 0.50, asia: 0.15, cash: 0.35 }),
    Object.freeze({ id: 'dynamic', world: 0.75, asia: 0.20, cash: 0.05 }),
    Object.freeze({ id: 'world-only', world: 1.00, asia: 0.00, cash: 0.00 })
  ]),
  returnFrequency: 'monthly',
  estimationRule: 'mean-and-variance-from-observations-available-before-as-of',
  simulationDistribution: 'unchanged-production-gaussian-monthly',
  simulationPathsPerForecast: 5000,
  seedRule: 'sha256-campaign-origin-portfolio-to-uint32',
  probabilityEvent: 'final-value-greater-than-initial-value',
  horizonMonths: 12,
  intervalLevels: Object.freeze([0.5, 0.9]),
  benchmark: 'dynamic-point-in-time-base-rate',
  primaryScore: 'brier-score'
});

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function prepareProspectiveCampaign() {
  const protocol = createProspectiveCampaignProtocol({
    campaignId: 'portfolio-probability-prospective-v1',
    protocolVersion: '1.0.0',
    registeredAt: '2026-08-07T20:35:00Z',
    engineCommit: ENGINE_COMMIT,
    assumptionsFingerprint: fingerprint(ASSUMPTIONS),
    timezone: 'Europe/Paris',
    cadence: 'quarterly',
    horizonMonths: ASSUMPTIONS.horizonMonths,
    simulationPathsPerForecast: ASSUMPTIONS.simulationPathsPerForecast,
    minimumIndependentForecasts: 100,
    portfolioIds: ASSUMPTIONS.portfolioCohort.map(portfolio => portfolio.id),
    coverageLevels: ASSUMPTIONS.intervalLevels,
    probabilityEvent: ASSUMPTIONS.probabilityEvent,
    benchmark: ASSUMPTIONS.benchmark,
    score: ASSUMPTIONS.primaryScore,
    exactLicensedDataRequired: true,
    independentHoldoutRequired: true,
    recalibrationBeforeDecisionForbidden: true
  });
  const calendar = createProspectiveCalendar(protocol, TARGET_ORIGINS);
  const sourceReadiness = assessLicensedBeginnerValidationReadiness();
  const launch = assessProspectiveCampaignLaunch({ protocol, calendar, sourceReadiness });
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'portfolio-probability-prospective-v1',
    status: launch.status,
    protocol,
    calendar,
    assumptions: ASSUMPTIONS,
    sourceReadiness,
    launch,
    forecasts: Object.freeze([]),
    settlements: Object.freeze([]),
    engineModified: false
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = prepareProspectiveCampaign();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/portfolio-probability-prospective-v1-launch.json', `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}
