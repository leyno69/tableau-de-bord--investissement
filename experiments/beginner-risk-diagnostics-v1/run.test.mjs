import test from 'node:test';
import assert from 'node:assert/strict';
import { runBeginnerRiskDiagnosticsV1 } from './run.mjs';

test('le diagnostic conserve un statut non décisionnel', async () => {
  const result = await runBeginnerRiskDiagnosticsV1();
  assert.equal(result.status, 'diagnostic-only');
  assert.equal(result.interpretation.engineChangeAuthorized, false);
  assert.equal(result.windows.length, 5);
});
