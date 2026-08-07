import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoricalDatasetManifest } from './portfolioHistoricalDatasetManifest.js';
import { runManifestedHistoricalReplay } from './portfolioHistoricalReplayRequest.js';

function manifest(ticker, overrides = {}) {
  return createHistoricalDatasetManifest({
    datasetId: `fixture-${ticker}-v1`, usage: 'fixture', providerId: 'local-fixture', licenseReference: 'test-only',
    sourceSymbol: ticker, normalizedInstrumentId: ticker.toLowerCase(), track: 'exact', interval: '1day',
    start: '2020-01-02', end: '2020-01-03', acquiredAt: '2026-08-07T00:00:00Z', timezone: 'UTC',
    currency: 'EUR', returnBasis: 'price-return', corporateActionPolicy: 'fixture', missingDataPolicy: 'reject',
    pointInTimeStatus: 'fixture-only', rawFingerprint: 'a'.repeat(64), normalizedFingerprint: 'b'.repeat(64),
    validationEligibleSource: false, ...overrides
  });
}

function input(overrides = {}) {
  return {
    purpose: 'fixture', track: 'exact', replayId: 'manifested-fixture-v1', initialCash: 1000,
    allocation: [{ ticker: 'AAA', weight: 0.5 }, { ticker: 'BBB', weight: 0.5 }],
    datasetManifests: { AAA: manifest('AAA'), BBB: manifest('BBB') },
    seriesByTicker: {
      AAA: [{ date: '2020-01-02', price: 100 }, { date: '2020-01-03', price: 101 }],
      BBB: [{ date: '2020-01-02', price: 50 }, { date: '2020-01-03', price: 49 }]
    },
    startDate: '2020-01-02', endDate: '2020-01-03', costPolicy: { transactionCostBps: 0 },
    ...overrides
  };
}

test('un replay fixture conserve les empreintes de ses manifests', () => {
  const result = runManifestedHistoricalReplay(input());
  assert.equal(result.datasetBindings.length, 2);
  assert.equal(result.purpose, 'fixture');
  assert.equal(result.track, 'exact');
});

test('une fixture ne peut pas être requalifiée en validation empirique', () => {
  assert.throws(() => runManifestedHistoricalReplay(input({ purpose: 'empirical-validation' })), /usage du manifeste incompatible/);
});

test('un manifeste proxy ne peut pas alimenter silencieusement une piste exacte', () => {
  const badManifest = manifest('AAA', { track: 'proxy' });
  assert.throws(() => runManifestedHistoricalReplay(input({ datasetManifests: { AAA: badManifest, BBB: manifest('BBB') } })), /track du manifeste incompatible/);
});
