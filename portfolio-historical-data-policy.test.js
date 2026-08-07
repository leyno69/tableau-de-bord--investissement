import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defineHistoricalSeriesContract,
  defineHistoricalBenchmarkPolicy,
} from './portfolio-historical-data-policy.js';

test('une série historique exige provenance, base de rendement et contrôles explicites', () => {
  const series = defineHistoricalSeriesContract({
    seriesId: 'world-total-return',
    provider: 'provider-a',
    providerSeriesId: 'WORLD-TR',
    licenseId: 'provider-a-research-license',
    currency: 'eur',
    timezone: 'Europe/Paris',
    frequency: 'daily',
    returnBasis: 'total-return-gross',
    pointInTimeVerified: true,
    corporateActionsDocumented: true,
    missingDataPolicyId: 'missing-data-v1',
    datasetFingerprint: 'sha256:example',
  });
  assert.equal(series.currency, 'EUR');
  assert.equal(series.returnBasis, 'total-return-gross');
  assert.equal(Object.isFrozen(series), true);
});

test('une série non vérifiée point-in-time est refusée', () => {
  assert.throws(() => defineHistoricalSeriesContract({
    seriesId: 'x', provider: 'p', providerSeriesId: 'x', licenseId: 'l', currency: 'EUR',
    timezone: 'UTC', frequency: 'daily', returnBasis: 'price', pointInTimeVerified: false,
    corporateActionsDocumented: true, missingDataPolicyId: 'm', datasetFingerprint: 'f',
  }), /pointInTimeVerified/);
});

test('la politique de benchmark doit être choisie avant les résultats et rester comparable', () => {
  const policy = defineHistoricalBenchmarkPolicy({
    policyId: 'benchmark-policy-v1',
    selectionRule: 'broad-market-reference-defined-before-validation',
    selectedBeforeOutcomeAccess: true,
    sameCurrencyRequired: true,
    sameReturnBasisRequired: true,
    benchmarks: [{ seriesId: 'world-total-return' }, { seriesId: 'cash-reference' }],
  });
  assert.deepEqual(policy.benchmarks, ['world-total-return', 'cash-reference']);
});

test('la politique de benchmark refuse une sélection après observation', () => {
  assert.throws(() => defineHistoricalBenchmarkPolicy({
    policyId: 'p', selectionRule: 'r', selectedBeforeOutcomeAccess: false,
    sameCurrencyRequired: true, sameReturnBasisRequired: true,
    benchmarks: [{ seriesId: 'b' }],
  }), /selectedBeforeOutcomeAccess/);
});
