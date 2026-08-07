import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationExecutionState } from './leynor-lab-simulation-execution-control.js';

test('calcule une progression reproductible', () => {
  const state = createSimulationExecutionState({ executionId: 'e1', campaignId: 'c1', status: 'running', completedBatches: 3, totalBatches: 10, lastCompletedBatchId: 'c1-batch-0003' });
  assert.equal(state.progress, 0.3);
});

test('refuse un statut terminé incomplet', () => {
  assert.throws(() => createSimulationExecutionState({ executionId: 'e', campaignId: 'c', status: 'completed', completedBatches: 2, totalBatches: 3 }));
});
