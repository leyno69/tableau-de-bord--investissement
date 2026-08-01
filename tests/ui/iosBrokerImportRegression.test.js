import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../../broker-import.css', import.meta.url), 'utf8');
const fixes = await readFile(new URL('../../broker-import-mobile-fixes.js', import.meta.url), 'utf8');
const importer = await readFile(new URL('../../broker-import.js', import.meta.url), 'utf8');
const pdfImporter = await readFile(new URL('../../broker-pdf-import.js', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');

test('la modale iPhone reste dans le viewport sans débordement horizontal', () => {
  assert.match(css, /inset:max\(8px,env\(safe-area-inset-top\)\) 8px/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(css, /min-inline-size:0/);
  assert.match(css, /max-inline-size:100%/);
});

test('le bouton fermer est arrondi, visible et accessible', () => {
  assert.match(css, /\.import-head \.icon-btn\{/);
  assert.match(css, /border-radius:16px/);
  assert.match(css, /inline-size:48px/);
  assert.match(fixes, /aria-label', 'Fermer la fenêtre d’import/);
});

test('un PDF est analysé au lieu d’être bloqué sur mobile', () => {
  assert.match(fixes, /Import PDF activé/);
  assert.match(fixes, /Mozilla PDF\.js/);
  assert.doesNotMatch(fixes, /stopImmediatePropagation/);
  assert.doesNotMatch(fixes, /lecture automatique n’est pas encore disponible/);
  assert.match(importer, /await parseBrokerPdf/);
  assert.match(pdfImporter, /getDocument/);
  assert.match(pdfImporter, /getTextContent/);
});

test('le correctif est chargé dans le runtime', () => {
  assert.match(sync, /import '\.\/broker-import-mobile-fixes\.js';/);
});
