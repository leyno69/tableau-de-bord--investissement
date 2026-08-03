import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

import { STATIC_FILES, listStaticAssetPaths } from '../../runtime/server/staticAssets.js';

function serviceWorkerShellPaths(source) {
  const match = source.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  assert.ok(match, 'APP_SHELL doit exister dans service-worker.js');
  return [...match[1].matchAll(/['"](\/[^'"]+)['"]/g)].map(item => item[1]);
}

test('Railway sert chaque ressource déclarée dans le shell PWA', async () => {
  const source = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
  const missing = serviceWorkerShellPaths(source).filter(path => !STATIC_FILES.has(path));
  assert.deepEqual(missing, [], `Ressources PWA absentes du serveur Railway : ${missing.join(', ')}`);
});

test('chaque ressource statique Railway existe réellement dans le dépôt', async () => {
  const missing = [];
  for (const path of listStaticAssetPaths()) {
    const [relativePath] = STATIC_FILES.get(path);
    try { await access(new URL(`../../${relativePath}`, import.meta.url)); }
    catch { missing.push(relativePath); }
  }
  assert.deepEqual(missing, [], `Fichiers statiques introuvables : ${missing.join(', ')}`);
});

test('les modules critiques de l’accueil sont servis sans passer par les routes métier', () => {
  for (const path of [
    '/app.js',
    '/home-recovery.js',
    '/storage-bootstrap.js',
    '/boot-diagnostics.js',
    '/interaction-audit.js',
    '/mobile-ui.js',
    '/radar-freshness.js',
    '/broker-import-wizard.js'
  ]) assert.ok(STATIC_FILES.has(path), `${path} doit être servi par Railway`);
});
