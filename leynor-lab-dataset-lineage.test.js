import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatasetLineage } from './leynor-lab-dataset-lineage.js';

test('conserve la chaîne de transformation des données', () => {
  const lineage = createDatasetLineage({ datasetId: 'd1', sourceName: 'source', sourceVersion: 'v1', acquiredAt: '2026-01-01', licenseReference: 'licence', finalChecksum: 'final', transformations: [{ id: 'clean', version: '1', inputChecksum: 'raw', outputChecksum: 'final' }] });
  assert.equal(lineage.transformations[0].outputChecksum, 'final');
});

test('refuse les transformations dupliquées', () => {
  const base = { datasetId: 'd', sourceName: 's', sourceVersion: 'v', acquiredAt: 't', licenseReference: 'l', finalChecksum: 'f' };
  assert.throws(() => createDatasetLineage({ ...base, transformations: [{ id: 'x', version: '1', inputChecksum: 'a', outputChecksum: 'b' }, { id: 'x', version: '2', inputChecksum: 'b', outputChecksum: 'c' }] }));
});
