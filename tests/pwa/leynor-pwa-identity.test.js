import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('manifest exposes the LEYNOR mobile identity', async () => {
  const manifest = JSON.parse(await read('manifest.webmanifest'));

  assert.equal(manifest.short_name, 'LEYNOR');
  assert.match(manifest.name, /^LEYNOR/);
  assert.equal(manifest.theme_color, '#071426');
  assert.equal(manifest.background_color, '#050b18');
  assert.equal(manifest.start_url, './?source=pwa');
  assert.equal(manifest.scope, './');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  assert.ok(manifest.shortcuts.some(shortcut => shortcut.short_name === 'LEYNOR AI'));
});

test('PWA resources remain valid on a GitHub Pages repository subpath', async () => {
  const source = await read('pwa.js');

  assert.match(source, /new URL\(path, document\.baseURI\)/);
  assert.match(source, /assetUrl\('manifest\.webmanifest'\)/);
  assert.match(source, /assetUrl\('service-worker\.js'\)/);
  assert.match(source, /apple-mobile-web-app-title/);
  assert.doesNotMatch(source, /href = '\/manifest\.webmanifest'/);
});

test('official icons carry the blue-night, gold and stars identity', async () => {
  const icon = await read('icons/leynor-icon.svg');
  const maskable = await read('icons/leynor-maskable.svg');

  for (const svg of [icon, maskable]) {
    assert.match(svg, /#071426/);
    assert.match(svg, /#f3cc72/);
    assert.match(svg, /LEYNOR/);
  }
  assert.match(icon, /deux étoiles/);
});
