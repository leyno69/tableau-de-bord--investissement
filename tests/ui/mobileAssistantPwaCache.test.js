import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const pwa = await readFile(new URL('../../pwa.js', import.meta.url), 'utf8');

test('le service worker migre le cache et précharge le panneau mobile', () => {
  assert.match(worker, /leynor-shell-v(?:[4-9]|\d{2,})/);
  assert.match(worker, /'\/assistant-ui\.js'/);
  assert.match(worker, /'\/assistant-memory\.js'/);
  assert.match(worker, /'\/portfolio-assistant\.js'/);
  assert.match(worker, /'\/pwa\.css'/);
});

test('une ressource manquante ne fait plus échouer toute l’installation PWA', () => {
  assert.doesNotMatch(worker, /cache\.addAll\(APP_SHELL\)/);
  assert.match(worker, /Promise\.allSettled\(APP_SHELL\.map/);
  assert.match(worker, /cacheShellSafely/);
  assert.match(worker, /cachedCount === 0/);
});

test('les anciens caches LEYNOR sont supprimés lors de l’activation', () => {
  assert.match(worker, /key\.startsWith\('leynor-shell-'\)/);
  assert.match(worker, /key !== CACHE_VERSION/);
  assert.match(worker, /caches\.delete\(key\)/);
});

test('les scripts et styles sont chargés en priorité depuis le réseau', () => {
  assert.match(worker, /request\.destination === 'script'/);
  assert.match(worker, /request\.destination === 'style'/);
  assert.match(worker, /fetch\(request, \{ cache: 'no-store' \}\)/);
});

test('la PWA force une seule actualisation après activation du nouveau worker', () => {
  assert.match(pwa, /updateViaCache: 'none'/);
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /sessionStorage\.getItem\(UPDATE_RELOAD_KEY\)/);
  assert.match(pwa, /window\.location\.reload\(\)/);
  assert.match(pwa, /registration\.update\(\)/);
});
