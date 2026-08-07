import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProspectiveCampaignProtocol,
  createProspectiveCalendar,
  assessProspectiveCampaignLaunch
} from './portfolioProspectiveCampaign.js';

const protocolInput = Object.freeze({
  campaignId: 'portfolio-probability-prospective-v1',
  protocolVersion: '1.0.0',
  registeredAt: '2026-08-07T20:35:00Z',
  engineCommit: '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9',
  assumptionsFingerprint: '9'.repeat(64),
  timezone: 'Europe/Paris',
  cadence: 'quarterly',
  horizonMonths: 12,
  simulationPathsPerForecast: 5000,
  minimumIndependentForecasts: 100,
  portfolioIds: ['defensive', 'beginner', 'dynamic', 'world-only'],
  coverageLevels: [0.5, 0.9],
  probabilityEvent: 'final-value-greater-than-initial-value',
  benchmark: 'dynamic-point-in-time-base-rate',
  score: 'brier-score',
  exactLicensedDataRequired: true,
  independentHoldoutRequired: true,
  recalibrationBeforeDecisionForbidden: true
});

test('fige un protocole prospectif déterministe en Europe/Paris', () => {
  const first = createProspectiveCampaignProtocol(protocolInput);
  const second = createProspectiveCampaignProtocol({ ...protocolInput });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.minimumIndependentForecasts, 100);
});

test('refuse un changement de fuseau, horizon ou budget après préenregistrement', () => {
  assert.throws(() => createProspectiveCampaignProtocol({ ...protocolInput, timezone: 'UTC' }), /Europe\/Paris/);
  assert.throws(() => createProspectiveCampaignProtocol({ ...protocolInput, horizonMonths: 3 }), /12/);
  assert.throws(() => createProspectiveCampaignProtocol({ ...protocolInput, simulationPathsPerForecast: 10000 }), /5000/);
});

test('construit un calendrier futur sans attribuer une indépendance non démontrée', () => {
  const protocol = createProspectiveCampaignProtocol(protocolInput);
  const calendar = createProspectiveCalendar(protocol, ['2026-10-01', '2027-01-01']);
  assert.equal(calendar.entries[0].maturityTargetLocalDate, '2027-10-01');
  assert.equal(calendar.entries[0].timezone, 'Europe/Paris');
  assert.equal(calendar.entries[0].mayCountAsIndependent, false);
  assert.throws(() => createProspectiveCalendar(protocol, ['2026-10-01', '2026-10-01']), /uniques/);
});

test('bloque le lancement tant que les données licenciées sont absentes', () => {
  const protocol = createProspectiveCampaignProtocol(protocolInput);
  const calendar = createProspectiveCalendar(protocol, ['2026-10-01']);
  const launch = assessProspectiveCampaignLaunch({
    protocol,
    calendar,
    sourceReadiness: { ready: false, blockers: ['worldProxy:missing', 'paej:missing'] }
  });
  assert.equal(launch.status, 'blocked-before-first-forecast');
  assert.equal(launch.evaluatedForecastCount, 0);
  assert.equal(launch.independentForecastCount, null);
  assert.equal(launch.mayExposeRealWorldProbability, false);
});

test('un registre contenant un résultat futur ne peut pas être lancé', () => {
  const protocol = createProspectiveCampaignProtocol(protocolInput);
  const calendar = createProspectiveCalendar(protocol, ['2026-10-01']);
  const launch = assessProspectiveCampaignLaunch({
    protocol,
    calendar,
    sourceReadiness: { ready: true, blockers: [] },
    forecastRegistry: [{ forecastId: 'f1', outcome: 1 }]
  });
  assert.ok(launch.blockers.includes('forecast-registry:contains-outcome-before-settlement'));
  assert.equal(launch.readyToSealForecasts, false);
});
