import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('LEYNOR uses a single canonical SVG asset across the product', async () => {
  const [brand, logo, manifest, icon] = await Promise.all([
    read('leynor-brand.js'),
    read('leynor-logo.js'),
    read('manifest.webmanifest'),
    read('icons/leynor-icon.svg')
  ]);

  assert.match(brand, /import '\.\/leynor-logo\.js'/);
  assert.match(logo, /\.\/icons\/leynor-icon\.svg/);
  assert.match(logo, /\.brand-mark/);
  assert.match(logo, /\.ai-orb/);
  assert.match(logo, /\.leynor-presence-core/);
  assert.match(manifest, /\.\/icons\/leynor-icon\.svg/);
  assert.match(icon, /trajectoire dorée montant vers deux étoiles/);
});

test('canonical logo keeps motion accessibility support', async () => {
  const css = await read('leynor-logo.css');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none !important/);
});
