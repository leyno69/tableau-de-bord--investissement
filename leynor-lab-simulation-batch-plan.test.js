import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationBatchPlan } from './leynor-lab-simulation-batch-plan.js';

test('découpe une campagne en lots déterministes', () => {
  const plan = createSimulationBatchPlan({ planId: 'p', campaignId: 'c', totalRuns: 2500, batchSize: 1000, maxConcurrency: 2 });
  assert.equal(plan.batchCount, 3);
  assert.deepEqual(plan.batches.map(batch => batch.size), [1000, 1000, 500]);
});

test('refuse une taille de lot invalide', () => {
  assert.throws(() => createSimulationBatchPlan({ planId: 'p', campaignId: 'c', totalRuns: 10, batchSize: 0 }));
});
