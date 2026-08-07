import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessHistoricalSource,
  buildHistoricalSourceRegistry,
  twelveDataHistoricalCandidate
} from './portfolioHistoricalSourceRegistry.js';

test('Twelve Data reste development-only tant que les preuves scientifiques manquent', () => {
  const result = assessHistoricalSource(twelveDataHistoricalCandidate);
  assert.equal(result.developmentEligible, true);
  assert.equal(result.validationEligible, false);
  assert.equal(result.status, 'development-only');
  assert.ok(result.blockers.includes('pointInTimeVerified'));
  assert.ok(result.blockers.includes('licenseVerified'));
});

test('une source ne devient validation-eligible que si toutes les exigences sont prouvées', () => {
  const result = assessHistoricalSource({
    id: 'verified-source-v1', provider: 'Verified Provider', apiOperational: true, schemaDocumented: true,
    licenseVerified: true, researchUseAllowed: true, pointInTimeVerified: true,
    corporateActionsVerified: true, adjustmentMethodDocumented: true,
    revisionPolicyDocumented: true, coverageVerified: true,
    evidence: ['contract/license-v1', 'methodology/data-v1']
  });
  assert.equal(result.validationEligible, true);
  assert.equal(result.status, 'validation-eligible');
  assert.deepEqual(result.blockers, []);
});

test('le registre refuse les identifiants dupliqués', () => {
  const base = { ...twelveDataHistoricalCandidate };
  assert.throws(() => buildHistoricalSourceRegistry([base, base]), /dupliquée/);
});

test('une API opérationnelle sans schéma documenté reste bloquée', () => {
  const result = assessHistoricalSource({
    ...twelveDataHistoricalCandidate,
    id: 'opaque-api-v1',
    schemaDocumented: false
  });
  assert.equal(result.status, 'blocked');
});
