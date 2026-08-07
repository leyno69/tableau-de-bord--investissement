import test from 'node:test';
import assert from 'node:assert/strict';
import { createMethodologyReleaseRegistry } from './leynor-lab-methodology-release-registry.js';

test('retourne la dernière release approuvée', () => {
  const registry = createMethodologyReleaseRegistry([
    { releaseId: '1.0.0', manifestId: 'm1', commitSha: 'a', status: 'approved', approvedAt: '2026-01-01' },
    { releaseId: '1.1.0', manifestId: 'm2', commitSha: 'b', status: 'approved', approvedAt: '2026-02-01', supersedesReleaseId: '1.0.0' }
  ]);
  assert.equal(registry.latestApproved().releaseId, '1.1.0');
});

test('refuse une release approuvée sans date', () => {
  assert.throws(() => createMethodologyReleaseRegistry([{ releaseId: '1', manifestId: 'm', commitSha: 'a', status: 'approved' }]));
});
