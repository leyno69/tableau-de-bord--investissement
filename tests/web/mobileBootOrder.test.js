import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobileRuntime = await readFile(new URL('../../mobile-ui.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('mobile-ui répare le stockage avant que app.js initialise son état', () => {
  assert.match(mobileRuntime, /^import \{ repairBrowserStorage \} from '\.\/storage-bootstrap\.js';/);
  const repairIndex = mobileRuntime.indexOf('repairBrowserStorage(globalThis.localStorage)');
  const iconsIndex = mobileRuntime.indexOf('const ICONS');
  assert.ok(repairIndex >= 0);
  assert.ok(iconsIndex > repairIndex);
});

test('le diagnostic de démarrage ne contient aucune donnée de portefeuille', () => {
  assert.match(mobileRuntime, /__LEYNOR_BOOT__/);
  assert.doesNotMatch(mobileRuntime, /positions\s*:/);
  assert.doesNotMatch(mobileRuntime, /watchlist\s*:/);
});

test('le cache PWA contient les modules de réparation et de runtime mobile', () => {
  assert.match(serviceWorker, /leynor-shell-v(?:2[3-9]|[3-9]\d|\d{3,})/);
  assert.match(serviceWorker, /'\/storage-bootstrap\.js'/);
  assert.match(serviceWorker, /'\/mobile-ui\.js'/);
});
