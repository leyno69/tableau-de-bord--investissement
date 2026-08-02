import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../asset-chart-touch.js', import.meta.url), 'utf8');

test('le graphique tactile expose valeur date variation absolue et relative', () => {
  assert.match(source, /calculateVariation/);
  assert.match(source, /current - first/);
  assert.match(source, /money\.format\(variation\.absolute\)/);
  assert.match(source, /variation\.percent\.toFixed\(2\)/);
  assert.match(source, /formatMoment\(point\.at, range\)/);
});

test('le curseur tactile suit le doigt et reste borné dans le graphique', () => {
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /Math\.max\(0, Math\.min\(1/);
  assert.match(source, /Math\.max\(13, Math\.min\(87, x\)\)/);
});

test('le graphique reste utilisable au clavier et compatible avec le défilement vertical mobile', () => {
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /touch-action:pan-y/);
  assert.match(source, /aria-label/);
});
