import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('assistant drawer stays within the mobile viewport and supports back navigation', async () => {
  const source = await read('assistant-ui.js');

  assert.match(source, /width:min\(460px,100vw\)/);
  assert.match(source, /max-width:100vw/);
  assert.match(source, /overflow-x:hidden/);
  assert.match(source, /overflow-wrap:anywhere/);
  assert.match(source, /window\.history\.pushState/);
  assert.match(source, /window\.addEventListener\('popstate'/);
  assert.match(source, /aria-label="Fermer l’assistant"/);
});

test('dashboard exposes the fictive simulation mode prominently', async () => {
  const source = await read('server-sync.js');
  const simulator = await read('simulator.html');

  assert.match(source, /data-simulation-shortcut/);
  assert.match(source, /Mode simulation/);
  assert.match(source, /href = 'simulator\.html'/);
  assert.match(simulator, /BAC À SABLE FICTIF/);
  assert.match(simulator, /aucun argent réel/);
});
