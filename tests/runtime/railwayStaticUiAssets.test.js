import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifestSource = await readFile(new URL('../../runtime/server/staticBetaAssets.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
const diagnosticsSource = await readFile(new URL('../../diagnostics-panel.js', import.meta.url), 'utf8');
const serverSyncSource = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');

function relativeImports(source) {
  return [...source.matchAll(/(?:import\s+(?:[^'\"]+\s+from\s+)?|import\()(['\"])(\.\/?[^'\"]+)\1/g)]
    .map(([, , path]) => path.replace(/^\.\//, ''));
}

function assertServed(path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(manifestSource, new RegExp(`\\['${escaped}',\\s*'text\\/javascript; charset=utf-8'\\]`), `${path} doit être exposé par le serveur Railway`);
}

test('Railway expose les modules récents du démarrage principal', () => {
  const recentModules = [
    'mobile-ui.js',
    'storage-schema.js',
    'storage-bootstrap.js',
    'boot-diagnostics.js',
    'interaction-audit.js',
    'diagnostics-panel.js'
  ];
  for (const modulePath of recentModules) assertServed(modulePath);
  assert.match(manifestSource, /\['diagnostics-panel\.css',\s*'text\/css; charset=utf-8'\]/);
});

test('les imports directs des graphes de démarrage ne peuvent plus être oubliés', () => {
  const imports = new Set([
    ...relativeImports(appSource),
    ...relativeImports(diagnosticsSource),
    ...relativeImports(serverSyncSource)
  ]);
  for (const modulePath of imports) {
    if (['brokers.js', 'portfolio.js', 'market.js', 'alerts.js'].includes(modulePath)) continue;
    assertServed(modulePath);
  }
});

test('Railway expose aussi la feuille de style chargée dynamiquement par l’assistant d’import', () => {
  assert.match(manifestSource, /\['broker-import-wizard\.css',\s*'text\/css; charset=utf-8'\]/);
});
