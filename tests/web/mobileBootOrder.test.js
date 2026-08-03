import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobileRuntime = await readFile(new URL('../../mobile-ui.js', import.meta.url), 'utf8');
const appRuntime = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('app.js possède seul la réparation du stockage au démarrage principal', () => {
  assert.match(appRuntime, /import \{ repairBrowserStorage, normalizePortfolio, normalizeWatchlist \} from '\.\/storage-bootstrap\.js';/);
  assert.match(appRuntime, /repairBrowserStorage\(storage\)/);
});

test('mobile-ui reste indépendant du stockage navigateur', () => {
  assert.doesNotMatch(mobileRuntime, /localStorage/);
  assert.doesNotMatch(mobileRuntime, /repairBrowserStorage/);
  assert.doesNotMatch(mobileRuntime, /__LEYNOR_BOOT__/);
  assert.match(mobileRuntime, /^const ICONS = Object\.freeze/);
});

test('le cache PWA contient les modules de réparation et de runtime mobile', () => {
  assert.match(serviceWorker, /leynor-shell-v(?:2[3-9]|[3-9]\d|\d{3,})/);
  assert.match(serviceWorker, /'\/storage-bootstrap\.js'/);
  assert.match(serviceWorker, /'\/mobile-ui\.js'/);
});
