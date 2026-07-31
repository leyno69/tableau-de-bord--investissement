import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('server sync loads the LEYNOR brand initializer', async () => {
  const source = await read('server-sync.js');
  assert.match(source, /import '\.\/leynor-brand\.js';/);
});

test('brand theme exposes the official night, electric blue and gold palette', async () => {
  const css = await read('leynor-brand.css');
  assert.match(css, /--leynor-night:/);
  assert.match(css, /--leynor-electric:/);
  assert.match(css, /--leynor-gold:/);
  assert.match(css, /prefers-reduced-motion/);
});

test('brand initializer applies LEYNOR product and AI wording', async () => {
  const source = await read('leynor-brand.js');
  assert.match(source, /LEYNOR — Votre copilote d’investissement/);
  assert.match(source, /Parler à LEYNOR AI/);
  assert.match(source, /leynor-brand\.css/);
});
