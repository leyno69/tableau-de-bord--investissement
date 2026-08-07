import test from 'node:test';
import assert from 'node:assert/strict';
import { runBeginnerHistoricalPilot } from './run.mjs';

test('le pilote beginner reproduit exactement son résumé publié', () => {
  const report = runBeginnerHistoricalPilot();
  assert.equal(report.summary.portfolioCount, 10000);
  assert.equal(report.summary.nominal.p05, 8786.99982376641);
  assert.equal(report.summary.nominal.median, 10407.214491469946);
  assert.equal(report.summary.nominal.p95, 12200.967380225184);
  assert.equal(report.summary.drawdown.median, 0.06736171952236952);
  assert.equal(report.summary.drawdown.p95, 0.15821575203984034);
  assert.equal(report.summary.drawdown.maximum, 0.2798064160067218);
});

test('le pilote est déterministe à graine et paramètres identiques', () => {
  assert.deepEqual(runBeginnerHistoricalPilot(), runBeginnerHistoricalPilot());
});
