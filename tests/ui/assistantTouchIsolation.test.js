import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../assistant-ui.js', import.meta.url), 'utf8');

test('le tiroir assistant fermé est invisible et ne participe pas au hit-testing', () => {
  assert.match(source, /\.assistant-drawer\{[^}]*visibility:hidden;pointer-events:none;/s);
  assert.match(source, /\.assistant-drawer\.open\{[^}]*visibility:visible;pointer-events:auto;/s);
  assert.match(source, /drawer\.setAttribute\('inert', ''\)/);
  assert.match(source, /drawer\.removeAttribute\('inert'\)/);
});

test('le backdrop fermé ne peut pas intercepter les touchers', () => {
  assert.match(source, /\.assistant-backdrop\{[^}]*visibility:hidden;pointer-events:none;/s);
  assert.match(source, /\.assistant-backdrop\.open\{[^}]*visibility:visible;pointer-events:auto;/s);
});
