import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNonOverlappingWindows, BEGINNER_PROXY_VALIDATION_PLAN_V1 } from './portfolioIndependentWindowPlan.js';

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

test('assertNonOverlappingWindows accepte le plan par défaut', () => {
  assert.equal(assertNonOverlappingWindows(BEGINNER_PROXY_VALIDATION_PLAN_V1.windows), true);
});

test('assertNonOverlappingWindows refuse un chevauchement réel, même étiqueté indépendant', () => {
  assert.throws(
    () => assertNonOverlappingWindows([
      { id: 'a', startDate: '2019-06-01', endDate: '2020-06-01' },
      { id: 'b', startDate: '2020-01-01', endDate: '2020-12-31' }
    ]),
    /se chevauchent/
  );
});

test('assertNonOverlappingWindows refuse une fenêtre inversée', () => {
  assert.throws(
    () => assertNonOverlappingWindows([{ id: 'a', startDate: '2020-12-31', endDate: '2020-01-01' }]),
    /antérieure/
  );
});
