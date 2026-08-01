import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profileMenu = await readFile(new URL('../../profile-menu.js', import.meta.url), 'utf8');
const portfolio = await readFile(new URL('../../portfolio.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('aucun portefeuille personnel n’est livré comme donnée par défaut', () => {
  assert.match(portfolio, /positions:\s*\[\s*\]/);
  assert.doesNotMatch(portfolio, /276\.121345|WPEA|PAEJ/);
});

test('le mode invité remplace les données privées par un portefeuille vide', () => {
  assert.match(profileMenu, /backupPrivateData/);
  assert.match(profileMenu, /applyGuestData/);
  assert.match(profileMenu, /JSON\.stringify\(\{ cash: 0, positions: \[\] \}\)/);
  assert.match(profileMenu, /storage\.setItem\(PORTFOLIO_KEY, EMPTY_PORTFOLIO\)/);
  assert.match(profileMenu, /storage\.setItem\(WATCHLIST_KEY, EMPTY_WATCHLIST\)/);
});

test('la déconnexion locale laisse un espace invité vide', () => {
  assert.match(profileMenu, /storage\.clear\(\);/);
  assert.match(profileMenu, /session\.clear\(\);/);
  assert.match(profileMenu, /applyGuestData\(storage\);/);
  assert.match(profileMenu, /Portefeuille privé masqué/);
});

test('le cache PWA est renouvelé pour propager la correction de confidentialité', () => {
  assert.match(serviceWorker, /leynor-shell-v17/);
});
