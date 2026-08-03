import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../broker-import-wizard.js', import.meta.url), 'utf8');

test('l’assistant d’import ne relance pas show depuis un observateur de tout son corps', () => {
  assert.doesNotMatch(
    source,
    /new MutationObserver\(\(\) => \{[\s\S]*?show\(Number\(shell\.dataset\.wizardStep\)/,
    'un MutationObserver ne doit jamais rappeler show() sur les mutations produites par show()'
  );
});

test('la découverte globale est arrêtée dès que le dialogue est monté', () => {
  assert.match(source, /discoveryObserver\?\.disconnect\(\)/);
  assert.match(source, /discoveryObserver = null/);
});

test('seul le statut d’analyse est observé après montage', () => {
  assert.match(source, /observe\(status, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.doesNotMatch(source, /observe\(body, \{ childList: true, subtree: true, characterData: true \}\)/);
});
