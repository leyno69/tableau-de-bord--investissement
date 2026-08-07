import test from 'node:test';
import assert from 'node:assert/strict';
import { BEGINNER_PROXY_VALIDATION_PLAN_V1 } from './portfolioIndependentWindowPlan.js';

test('les fenêtres du plan sont non chevauchantes et figées avant lecture des données licenciées', () => {
  assert.equal(BEGINNER_PROXY_VALIDATION_PLAN_V1.lockedBeforeLicensedDataRead, true);
  const windows = BEGINNER_PROXY_VALIDATION_PLAN_V1.windows;
  for (let index = 1; index < windows.length; index += 1) {
    assert.ok(windows[index - 1].endDate < windows[index].startDate);
  }
});

test('le plan conserve la piste proxy et la poche cash exemptée de coûts', () => {
  assert.equal(BEGINNER_PROXY_VALIDATION_PLAN_V1.track, 'proxy');
  assert.deepEqual(BEGINNER_PROXY_VALIDATION_PLAN_V1.costPolicy.exemptTickers, ['CASH']);
  assert.equal(BEGINNER_PROXY_VALIDATION_PLAN_V1.interpretation, 'regime-stratified-non-overlapping-not-iid');
});
