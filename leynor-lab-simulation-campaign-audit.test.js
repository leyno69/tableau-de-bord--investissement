import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSimulationCampaign } from './leynor-lab-simulation-campaign-audit.js';

const valid = {
  campaignId:'campaign-pilot-001', campaignSpecId:'spec-1', datasetLineageId:'data-1',
  reproducibilityBundleId:'bundle-1', seedPlanId:'seeds-1', batchPlanId:'batches-1',
  executionId:'execution-1', resultSnapshotId:'results-1', executionStatus:'completed',
  completedBatches:40, totalBatches:40, completedReplications:5, plannedReplications:5,
  metricsComplete:true, percentilesComplete:true, assumptionsDocumented:true,
  limitationsDocumented:true, nonPredictionNoticePresent:true, dataIntegrityVerified:true
};

test('valide une campagne complète', () => {
  const result = auditSimulationCampaign(valid);
  assert.equal(result.passed, true);
  assert.equal(result.decision, 'publishable-for-methodological-review');
});

test('bloque une campagne incomplète', () => {
  const result = auditSimulationCampaign({ ...valid, completedBatches:39, limitationsDocumented:false });
  assert.equal(result.passed, false);
  assert.deepEqual(result.blockers, ['batches-incomplete','limitations-undocumented']);
});
