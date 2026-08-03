import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const recovery = await readFile(new URL('../../home-recovery.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const staticAssets = await readFile(new URL('../../runtime/server/staticBetaAssets.js', import.meta.url), 'utf8');

test('le démarrage de secours est chargé après les runtimes principaux', () => {
  assert.match(index, /src="broker-import\.js"><\/script>\s*<script type="module" src="home-recovery\.js"><\/script>/);
  assert.match(recovery, /RECOVERY_DELAY_MS = 1200/);
  assert.match(recovery, /applicationIsReady\(\)/);
  assert.match(recovery, /releasePotentialBlockers\(\)/);
});

test('le secours remplace l’état Chargement et réactive les actions critiques', () => {
  assert.match(recovery, /#portfolioValue/);
  assert.match(recovery, /#brokerSelect/);
  assert.match(recovery, /#addPositionBtn/);
  assert.match(recovery, /#addWatchBtn/);
  assert.match(recovery, /leynor:home-recovered/);
});

test('Railway et la PWA publient le runtime de secours', () => {
  assert.match(worker, /leynor-shell-v25/);
  assert.match(worker, /'\/home-recovery\.js'/);
  assert.match(staticAssets, /\['home-recovery\.js', 'text\/javascript; charset=utf-8'\]/);
});
