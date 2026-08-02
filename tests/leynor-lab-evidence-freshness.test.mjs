import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvidenceFreshness } from '../leynor-lab-evidence-freshness.js';

const base = {
  evidenceId: 'evidence-1',
  policyId: 'freshness-policy',
  policyVersion: '1.0.0',
  observedAt: '2026-01-01T00:00:00.000Z',
  evaluatedAt: '2026-01-20T00:00:00.000Z',
  maximumAgeDays: 30,
  limitations: ['La fraîcheur ne mesure pas la qualité scientifique.']
};

test('classe une preuve récente comme courante', () => {
  const result = evaluateEvidenceFreshness(base);
  assert.equal(result.status, 'current');
  assert.equal(result.ageDays, 19);
  assert.deepEqual(result.blockers, []);
  assert.ok(Object.isFrozen(result));
});

test('bloque une preuve trop ancienne', () => {
  const result = evaluateEvidenceFreshness({ ...base, evaluatedAt: '2026-02-15T00:00:00.000Z' });
  assert.equal(result.status, 'stale');
  assert.deepEqual(result.blockers, ['evidence-stale']);
});

test('refuse une politique arbitraire ou une chronologie invalide', () => {
  assert.throws(() => evaluateEvidenceFreshness({ ...base, maximumAgeDays: -1 }), /maximumAgeDays/);
  assert.throws(() => evaluateEvidenceFreshness({ ...base, evaluatedAt: '2025-12-01T00:00:00.000Z' }), /précéder/);
});
