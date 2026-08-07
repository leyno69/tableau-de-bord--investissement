import test from 'node:test';
import assert from 'node:assert/strict';
import { createReproducibilityBundle } from './leynor-lab-reproducibility-bundle.js';

test('fige un bundle reproductible ordonné', () => {
  const bundle = createReproducibilityBundle({ bundleId: 'b1', methodologyReleaseId: '1.0.0', runtimeVersion: 'node-22', dependencyLockChecksum: 'lock', sourceCommitSha: 'abc', files: [{ path: 'z.json', checksum: '2' }, { path: 'a.json', checksum: '1' }] });
  assert.deepEqual(bundle.files.map(file => file.path), ['a.json', 'z.json']);
  assert.match(bundle.serialize(), /methodologyReleaseId/);
});

test('refuse les chemins dupliqués', () => {
  assert.throws(() => createReproducibilityBundle({ bundleId: 'b', methodologyReleaseId: '1', runtimeVersion: 'n', dependencyLockChecksum: 'l', sourceCommitSha: 's', files: [{ path: 'a', checksum: '1' }, { path: 'a', checksum: '2' }] }));
});
