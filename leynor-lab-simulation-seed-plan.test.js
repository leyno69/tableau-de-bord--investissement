import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationSeedPlan } from './leynor-lab-simulation-seed-plan.js';

test('génère des réplications déterministes distinctes', () => {
  const plan = createSimulationSeedPlan({ planId: 'p1', campaignId: 'c1', baseSeed: 42, replicationCount: 4 });
  assert.deepEqual(plan.seeds, [42, 104771, 209500, 314229]);
});

test('exige plusieurs réplications', () => {
  assert.throws(() => createSimulationSeedPlan({ planId: 'p', campaignId: 'c', baseSeed: 1, replicationCount: 1 }));
});
