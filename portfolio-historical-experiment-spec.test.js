import test from 'node:test';
import assert from 'node:assert/strict';
import { sealPortfolioHistoricalExperimentSpec } from './portfolio-historical-experiment-spec.js';

const valid = {
  specId: 'historical-beginner-v1',
  sourcePresetId: 'beginner',
  methodologyVersion: 'portfolio-historical-validation-v1',
  engineCommitSha: 'a'.repeat(40),
  referenceDate: '2010-01-04',
  horizonYears: 5,
  allocation: [
    { label: 'ETF Monde', weight: 0.5 },
    { label: 'ETF Asie', weight: 0.15 },
    { label: 'Liquidités', weight: 0.35 },
  ],
  rebalancingPolicyId: 'annual-fixed-target-v1',
  costPolicyId: 'historical-cost-policy-v1',
  campaignId: 'campaign-beginner-v1',
  seedPlanId: 'seed-plan-beginner-v1',
  resultSnapshotId: 'snapshot-beginner-v1',
};

test('une spécification complète est scellée et déterministe', () => {
  const first = sealPortfolioHistoricalExperimentSpec(valid);
  const second = sealPortfolioHistoricalExperimentSpec(valid);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'sealed');
  assert.match(first.fingerprint, /^[a-f0-9]{8}$/);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.allocation), true);
});

test('une modification méthodologique change l’empreinte', () => {
  const first = sealPortfolioHistoricalExperimentSpec(valid);
  const second = sealPortfolioHistoricalExperimentSpec({ ...valid, costPolicyId: 'historical-cost-policy-v2' });
  assert.notEqual(first.fingerprint, second.fingerprint);
});

test('le scellement refuse les références incomplètes ou ambiguës', () => {
  assert.throws(() => sealPortfolioHistoricalExperimentSpec({ ...valid, referenceDate: '' }), /referenceDate/);
  assert.throws(() => sealPortfolioHistoricalExperimentSpec({ ...valid, engineCommitSha: 'abc' }), /SHA Git complet/);
  assert.throws(() => sealPortfolioHistoricalExperimentSpec({ ...valid, allocation: [{ label: 'Monde', weight: 0.8 }] }), /totaliser 1/);
  assert.throws(() => sealPortfolioHistoricalExperimentSpec({ ...valid, campaignId: '' }), /campaignId/);
});
