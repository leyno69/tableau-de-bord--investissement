import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const diagnostics = await readFile(new URL('../../boot-diagnostics.js', import.meta.url), 'utf8');
const storageBootstrap = await readFile(new URL('../../storage-bootstrap.js', import.meta.url), 'utf8');

test('le diagnostic masque les secrets courants', () => {
  assert.match(diagnostics, /Bearer \[masqué\]/);
  assert.match(diagnostics, /api\[_-\]\?key\|token\|secret/);
});

test('le diagnostic limite le nombre et la taille des erreurs', () => {
  assert.match(diagnostics, /MAX_ERRORS = 8/);
  assert.match(diagnostics, /slice\(0, 500\)/);
});

test('la réparation du stockage capture les erreurs de lecture et écriture', () => {
  assert.match(storageBootstrap, /recordBootError\(error, `storage\.read/);
  assert.match(storageBootstrap, /recordBootError\(error, `storage\.write/);
  assert.match(storageBootstrap, /setBootPhase\('storage-ready'\)/);
});
