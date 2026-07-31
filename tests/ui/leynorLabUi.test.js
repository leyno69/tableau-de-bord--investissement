import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../leynor-lab.html', import.meta.url), 'utf8');
const ui = await readFile(new URL('../../leynor-lab-ui.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const simulator = await readFile(new URL('../../simulator.html', import.meta.url), 'utf8');
const assets = await readFile(new URL('../../runtime/server/staticBetaAssets.js', import.meta.url), 'utf8');

test('le laboratoire expose paramètres progression annulation et rapport', () => {
  assert.match(html, /Laboratoire Premium LEYNOR/);
  assert.match(html, /id="labCount"/);
  assert.match(html, /id="labProgress"/);
  assert.match(html, /id="labCancel"/);
  assert.match(html, /id="labReport"/);
});

test('l’interface lance le moteur par lots et construit le rapport exhaustif', () => {
  assert.match(ui, /runAdvancedLabSimulationBatched/);
  assert.match(ui, /buildExhaustiveLeynorReport/);
  assert.match(ui, /AbortController/);
  assert.match(ui, /onProgress/);
});

test('le laboratoire est accessible et disponible dans les deux runtimes', () => {
  assert.match(simulator, /leynor-lab\.html/);
  assert.match(worker, /leynor-shell-v11/);
  assert.match(worker, /'\/leynor-lab\.html'/);
  assert.match(assets, /\['leynor-lab\.html', 'text\/html; charset=utf-8'\]/);
});
