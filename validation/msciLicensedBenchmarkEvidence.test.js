import test from 'node:test';
import assert from 'node:assert/strict';
import { msciWorldLicensedCandidate, msciBenchmarkSourceRegistry } from './msciLicensedBenchmarkEvidence.js';

test('MSCI World est identifié officiellement mais reste bloqué sans licence de production', () => {
  assert.equal(msciWorldLicensedCandidate.benchmark.indexCode, '990100');
  assert.equal(msciWorldLicensedCandidate.benchmark.returnVariant, 'NETR');
  assert.equal(msciWorldLicensedCandidate.benchmark.requiredCurrency, 'EUR');
  assert.equal(msciWorldLicensedCandidate.benchmark.productionDataStatus, 'license-required');
  assert.equal(msciWorldLicensedCandidate.researchUseAllowed, false);
});

test('le registre ne promeut pas MSCI en source admissible tant que les exigences restent incomplètes', () => {
  assert.equal(msciBenchmarkSourceRegistry.entries.length, 1);
  assert.equal(msciBenchmarkSourceRegistry.entries[0].status, 'blocked');
  assert.equal(msciBenchmarkSourceRegistry.entries[0].validationEligible, false);
  assert.ok(msciBenchmarkSourceRegistry.entries[0].blockers.includes('researchUseAllowed'));
});
