import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../../simulator-ui.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('les scénarios utilisent une délégation de clic robuste', () => {
  assert.match(ui, /section\.addEventListener\('click'/);
  assert.match(ui, /closest\('button\[data-preset\]'\)/);
  assert.match(ui, /loadPreset\(button\.dataset\.preset, button\)/);
});

test('le chargement donne un retour visible et mémorise le scénario actif', () => {
  assert.match(ui, /Chargement…/);
  assert.match(ui, /Scénario «/);
  assert.match(ui, /ACTIVE_PRESET_KEY/);
  assert.match(ui, /aria-pressed/);
  assert.match(ui, /presetFeedback/);
  assert.match(ui, /scrollIntoView/);
});

test('la PWA force la mise à jour des fichiers de simulation', () => {
  assert.match(worker, /leynor-shell-v5/);
  assert.match(worker, /'\/simulator\.html'/);
  assert.match(worker, /'\/simulator-ui\.js'/);
  assert.match(worker, /'\/simulation-presets\.js'/);
  assert.match(worker, /'\/portfolio-simulator\.js'/);
});
