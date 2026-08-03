import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../radar-freshness.js', import.meta.url), 'utf8');

test('la fraîcheur radar ne réécrit pas innerHTML dans son propre MutationObserver', () => {
  assert.doesNotMatch(source, /(?:summary|meta)\.innerHTML\s*=/);
  assert.match(source, /function syncMeta\(meta, values\)/);
  assert.match(source, /current\.every\(\(value, index\) => value === values\[index\]\)/);
});

test('les mutations produites par les métadonnées de fraîcheur sont ignorées', () => {
  assert.match(source, /!mutation\.target\.closest\?\.\('\.radar-card-freshness'\)/);
  assert.match(source, /if \(externalChange\) renderRadarFreshness\(\)/);
});
