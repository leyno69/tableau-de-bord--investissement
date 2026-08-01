import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tour = await readFile(new URL('../../guided-tour.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../guided-tour.css', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const staticAssets = await readFile(new URL('../../runtime/server/staticBetaAssets.js', import.meta.url), 'utf8');

test('la visite guidée présente les fonctions principales avec lecture vocale', () => {
  assert.match(tour, /Bienvenue dans LEYNOR/);
  assert.match(tour, /Votre portefeuille/);
  assert.match(tour, /Radar et tendances/);
  assert.match(tour, /Assistant LEYNOR/);
  assert.match(tour, /speakAnswer\(`/);
  assert.match(tour, /data-tour-action="next"/);
  assert.match(tour, /data-tour-action="previous"/);
  assert.match(tour, /data-tour-action="quit"/);
});

test('la visite reste volontaire et mémorise son achèvement', () => {
  assert.match(tour, /data-start-guided-tour/);
  assert.match(tour, /leynor-guided-tour-completed/);
  assert.match(tour, /localStorage\.setItem\(TOUR_KEY, 'true'\)/);
  assert.match(tour, /Visite guidée/);
});

test('les ressources de visite sont chargées et disponibles hors connexion', () => {
  assert.match(sync, /import '\.\/guided-tour\.js'/);
  assert.match(worker, /leynor-shell-v16/);
  assert.match(worker, /'\/guided-tour\.js'/);
  assert.match(worker, /'\/guided-tour\.css'/);
  assert.match(staticAssets, /\['guided-tour\.js', 'text\/javascript; charset=utf-8'\]/);
  assert.match(staticAssets, /\['guided-tour\.css', 'text\/css; charset=utf-8'\]/);
  assert.match(styles, /guided-tour-target/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});
