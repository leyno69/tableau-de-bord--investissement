import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProspectiveForecast,
  evaluateIntervalCoverage,
  evaluateProbabilityCalibration,
  settleProspectiveForecast
} from './portfolioProbabilityCalibration.js';

const sourceFields = Object.freeze({
  benchmarkProbability: 0.55,
  datasetManifestFingerprints: Object.freeze(['a'.repeat(64), 'b'.repeat(64)]),
  inputDataFingerprint: 'c'.repeat(64),
  simulationSeed: 42
});

function prospectiveInput(overrides = {}) {
  return {
    forecastId: 'f1',
    engineCommit: 'abc',
    portfolioId: 'p1',
    asOf: '2026-08-07T00:00:00Z',
    sealedAt: '2026-08-07T01:00:00Z',
    maturesAt: '2026-11-07T00:00:00Z',
    horizonMonths: 3,
    probability: 0.6,
    intervals: {},
    assumptionsFingerprint: 'd'.repeat(64),
    ...sourceFields,
    createdWithoutOutcomeAccess: true,
    ...overrides
  };
}

test('mesure couverture et incertitude sans fabriquer une validation', () => {
  const records = Array.from({ length: 20 }, (_, outcome) => ({
    outcome,
    intervals: { '0.5': { lower: 5, upper: 14 }, '0.9': { lower: 1, upper: 18 } }
  }));
  const result = evaluateIntervalCoverage(records);
  assert.equal(result[0].hits, 10);
  assert.equal(result[1].hits, 18);
  assert.ok(result[0].wilson95.lower < result[0].observedCoverage);
});

test('compare le score probabiliste à un taux de base', () => {
  const records = [{ probability: 0.8, binaryOutcome: true }, { probability: 0.2, binaryOutcome: false }];
  const result = evaluateProbabilityCalibration(records, 0.5);
  assert.equal(result.comparison.beatsBenchmark, true);
});

test('verrouille une prévision prospective avant maturité', () => {
  const forecast = createProspectiveForecast(prospectiveInput(), '2026-08-07T01:00:00Z');
  assert.throws(() => settleProspectiveForecast(forecast, {
    observedAt: '2026-11-07T00:00:00Z', outcome: 1, binaryOutcome: true
  }, '2026-10-01T00:00:00Z'), /non mature/);
  const settled = settleProspectiveForecast(forecast, {
    observedAt: '2026-11-07T00:00:00Z', outcome: 1, binaryOutcome: true
  }, '2026-11-08T00:00:00Z');
  assert.equal(settled.forecastFingerprint, forecast.fingerprint);
});

test('fige profondément les intervalles et les sources', () => {
  const forecast = createProspectiveForecast(prospectiveInput({
    forecastId: 'f2', intervals: { '0.9': { lower: 0.7, upper: 1.3 } }
  }), '2026-08-07T01:00:00Z');
  assert.equal(Object.isFrozen(forecast.intervals), true);
  assert.equal(Object.isFrozen(forecast.intervals['0.9']), true);
  assert.equal(Object.isFrozen(forecast.datasetManifestFingerprints), true);
  assert.throws(() => { forecast.intervals['0.9'].lower = 0; }, TypeError);
});

test('refuse un résultat prospectif coercible ou daté dans le futur', () => {
  const forecast = createProspectiveForecast(prospectiveInput({ forecastId: 'f3' }), '2026-08-07T01:00:00Z');
  assert.throws(() => settleProspectiveForecast(forecast, {
    observedAt: '2026-11-07T00:00:00Z', outcome: 1, binaryOutcome: 'false'
  }, '2026-11-08T00:00:00Z'), /booléen/);
  assert.throws(() => settleProspectiveForecast(forecast, {
    observedAt: '2026-12-01T00:00:00Z', outcome: 1, binaryOutcome: true
  }, '2026-11-08T00:00:00Z'), /postérieur/);
});

test('scelle la date de création et refuse toute fuite de résultat', () => {
  const input = prospectiveInput({ forecastId: 'f4' });
  const forecast = createProspectiveForecast(input, '2026-08-07T01:00:00Z');
  assert.equal(forecast.sealedAt, input.sealedAt);
  assert.throws(() => createProspectiveForecast({ ...input, binaryOutcome: true }, '2026-08-07T01:00:00Z'), /interdit/);
  assert.throws(() => createProspectiveForecast({ ...input, sealedAt: '2026-08-08T00:00:00Z' }, '2026-08-07T01:00:00Z'), /postérieur à now/);
});

test('refuse une prévision sans benchmark, graine et empreintes de source', () => {
  const { benchmarkProbability, datasetManifestFingerprints, inputDataFingerprint, simulationSeed, ...incomplete } = prospectiveInput({ forecastId: 'f5' });
  assert.throws(() => createProspectiveForecast(incomplete, '2026-08-07T01:00:00Z'));
  assert.throws(() => createProspectiveForecast({
    ...incomplete,
    benchmarkProbability,
    datasetManifestFingerprints,
    inputDataFingerprint: 'proxy',
    simulationSeed
  }, '2026-08-07T01:00:00Z'), /SHA-256/);
});
