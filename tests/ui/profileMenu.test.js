import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [script, styles, sync, worker] = await Promise.all([
  readFile(new URL('../../profile-menu.js', import.meta.url), 'utf8'),
  readFile(new URL('../../profile-menu.css', import.meta.url), 'utf8'),
  readFile(new URL('../../server-sync.js', import.meta.url), 'utf8'),
  readFile(new URL('../../service-worker.js', import.meta.url), 'utf8')
]);

test('profile menu exposes a touch-friendly local sign-out action', () => {
  assert.match(script, /Se déconnecter de cet appareil/);
  assert.match(script, /localStorage/);
  assert.match(script, /sessionStorage/);
  assert.match(script, /aria-expanded/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /touch-action: manipulation/);
});

test('profile menu is initialized and cached by the beta shell', () => {
  assert.match(sync, /import '\.\/profile-menu\.js'/);
  assert.match(worker, /'\/profile-menu\.js'/);
  assert.match(worker, /'\/profile-menu\.css'/);
});
