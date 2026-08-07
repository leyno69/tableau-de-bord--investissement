import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditedHistoricalProviderRegistry,
  tiingoHistoricalCandidate,
  eodhdHistoricalCandidate,
  norgateHistoricalCandidate
} from './portfolioHistoricalProviderEvidence.js';
import { assessHistoricalSource } from './portfolioHistoricalSourceRegistry.js';

test('aucun fournisseur audité n’est promu sans toutes les preuves', () => {
  assert.equal(auditedHistoricalProviderRegistry.counts.validationEligible, 0);
  assert.equal(auditedHistoricalProviderRegistry.counts.total, 4);
});

test('Tiingo conserve ses preuves positives sans masquer les blocages', () => {
  const result = assessHistoricalSource(tiingoHistoricalCandidate);
  assert.equal(tiingoHistoricalCandidate.corporateActionsVerified, true);
  assert.equal(tiingoHistoricalCandidate.adjustmentMethodDocumented, true);
  assert.equal(tiingoHistoricalCandidate.revisionPolicyDocumented, true);
  assert.equal(result.validationEligible, false);
  assert.ok(result.blockers.includes('researchUseAllowed'));
  assert.ok(result.blockers.includes('pointInTimeVerified'));
});

test('EODHD documente les radiations sans prouver le point-in-time', () => {
  const result = assessHistoricalSource(eodhdHistoricalCandidate);
  assert.equal(eodhdHistoricalCandidate.corporateActionsVerified, true);
  assert.equal(result.validationEligible, false);
  assert.ok(result.blockers.includes('pointInTimeVerified'));
  assert.ok(result.blockers.includes('adjustmentMethodDocumented'));
});

test('Norgate reste bloqué pour ce projet tant que licence et couverture ne sont pas adaptées', () => {
  const result = assessHistoricalSource(norgateHistoricalCandidate);
  assert.equal(result.status, 'blocked');
  assert.ok(result.blockers.includes('researchUseAllowed'));
  assert.ok(result.blockers.includes('coverageVerified'));
});
