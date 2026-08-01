import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('broker import exposes a searchable catalog and a real close control', async () => {
  const source = await read('broker-import.js');
  assert.match(source, /Rechercher un courtier/);
  assert.match(source, /data-close-import/);
  assert.match(source, /Trade Republic/);
  assert.match(source, /BoursoBank/);
  assert.match(source, /Interactive Brokers/);
  assert.match(source, /Autre courtier/);
  assert.match(source, /Importer dans LEYNOR/);
});

test('mobile import dialog respects dynamic viewport and safe areas', async () => {
  const css = await read('broker-import.css');
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /import-review-actions/);
  assert.match(css, /position:sticky/);
});

test('guided tour keeps its body scrollable and actions fixed inside the card', async () => {
  const css = await read('guided-tour.css');
  assert.match(css, /max-height:calc\(100dvh/);
  assert.match(css, /#guidedTourText\{[^}]*overflow-y:auto/);
  assert.match(css, /guided-tour-actions[^}]*flex:0 0 auto/);
  assert.match(css, /safe-area-inset-bottom/);
});
