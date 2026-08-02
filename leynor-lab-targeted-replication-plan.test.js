import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTargetedReplicationPlan,
  classifyConvergence,
  evaluateReplicationStop,
  requiredSeedCount,
} from './leynor-lab-targeted-replication-plan.js';

const key = 'behavior=regular|reserveMonths=0|lineCount=5|assetVolatility=0.2|correlation=0.75|shockIntensity=7200|years=30';

test('classe explicitement les niveaux de convergence', () => {
  assert.equal(classifyConvergence(0.03, 5), 'stable');
  assert.equal(classifyConvergence(0.08, 5), 'watch');
  assert.equal(classifyConvergence(0.15, 5), 'unstable');
  assert.equal(classifyConvergence(0.01, 3), 'insufficient');
});

test('augmente le budget par lots sans dépasser le plafond', () => {
  assert.equal(requiredSeedCount(0.03, 5), 5);
  assert.equal(requiredSeedCount(0.08, 5), 15);
  assert.equal(requiredSeedCount(0.2, 5), 25);
});

test('produit un plan déterministe uniquement pour les cellules non convergées', () => {
  const rows = [
    { cellKey: key, relativeDispersion: 0.15, seedCount: 5 },
    { cellKey: key.replace('correlation=0.75', 'correlation=0.1'), relativeDispersion: 0.03, seedCount: 5 },
  ];
  const first = buildTargetedReplicationPlan(rows, { startingSeed: 9000 });
  const second = buildTargetedReplicationPlan(rows, { startingSeed: 9000 });

  assert.deepEqual(first, second);
  assert.equal(first.cellCount, 2);
  assert.equal(first.targetedCellCount, 1);
  assert.equal(first.additionalReplicationCount, 20);
  assert.deepEqual(first.cells[0].seeds.slice(0, 3), [9000, 9001, 9002]);
  assert.equal(first.cells[1].stopReason, 'dispersion target reached');
  assert.equal(first.cells[0].factors.years, 30);
});

test('arrête sur convergence ou épuisement du budget', () => {
  const converged = evaluateReplicationStop(
    { relativeDispersion: 0.08, seedCount: 5, median: 100 },
    { relativeDispersion: 0.04, seedCount: 10, median: 101 },
  );
  assert.equal(converged.stop, true);
  assert.match(converged.reason, /targets reached/);

  const exhausted = evaluateReplicationStop(
    { relativeDispersion: 0.15, seedCount: 20, median: 100 },
    { relativeDispersion: 0.12, seedCount: 25, median: 110 },
  );
  assert.equal(exhausted.stop, true);
  assert.match(exhausted.reason, /maximum seed budget/);
});
