import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readText = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('LEYNOR manifest exposes an installable standalone application', async () => {
  const manifest = JSON.parse(await readText('manifest.webmanifest'));

  assert.equal(manifest.short_name, 'LEYNOR');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/?source=pwa');
  assert.equal(manifest.theme_color, '#102c46');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
});

test('service worker caches the critical LEYNOR shell', async () => {
  const source = await readText('service-worker.js');

  for (const asset of ['/index.html', '/offline.html', '/pwa.js', '/leynor-assistant.js']) {
    assert.match(source, new RegExp(asset.replaceAll('/', '\\/')));
  }
  assert.match(source, /networkFirst/);
  assert.match(source, /staleWhileRevalidate/);
});

test('offline page preserves LEYNOR language and recovery action', async () => {
  const page = await readText('offline.html');

  assert.match(page, /lang="fr"/);
  assert.match(page, /Connexion interrompue/);
  assert.match(page, /Réessayer/);
});
