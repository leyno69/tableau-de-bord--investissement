import test from 'node:test';
import assert from 'node:assert/strict';
import { assessIntradayReadiness, buildSpeculativeSignal } from '../../speculative-radar.js';

test('speculative engine blocks incomplete snapshots', () => {
  const signal = buildSpeculativeSignal({ price: 100 });
  assert.equal(signal.status, 'blocked');
  assert.equal(signal.confidence, 0);
  assert.ok(signal.readiness.missing.includes('volume'));
  assert.equal(signal.direction, null);
});

test('fresh complete intraday data may produce a short-lived watch signal', () => {
  const snapshot = {
    price: 100,
    timestamp: new Date().toISOString(),
    volume: 3000,
    averageVolume: 1000,
    spreadPct: 0.1,
    volatilityPct: 2,
    liquidityScore: 90,
    momentumPct: 2.5
  };
  const readiness = assessIntradayReadiness(snapshot);
  const signal = buildSpeculativeSignal(snapshot);
  assert.equal(readiness.ready, true);
  assert.equal(signal.direction, 'hausse');
  assert.ok(signal.confidence >= 60);
  assert.ok(signal.expiresAt);
});
