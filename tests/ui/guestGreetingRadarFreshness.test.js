import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profile = await readFile(new URL('../../profile-menu.js', import.meta.url), 'utf8');
const freshness = await readFile(new URL('../../radar-freshness.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('le mode invité ne conserve pas le prénom du propriétaire dans l’accueil', () => {
  assert.match(profile, /Bienvenue, voici l’essentiel\./);
  assert.match(profile, /mode === 'guest'/);
  assert.match(profile, /updateGreeting\(mode\)/);
});

test('le radar expose la date du calcul et la politique de mise à jour', () => {
  assert.match(freshness, /Calculé le/);
  assert.match(freshness, /Prochaine mise à jour : au prochain appui sur Actualiser/);
  assert.match(freshness, /marketUpdatedAt/);
  assert.match(freshness, /Donnée de marché horodatée/);
  assert.match(freshness, /Valeur enregistrée localement/);
});

test('les métadonnées de fraîcheur sont disponibles hors connexion', () => {
  assert.match(profile, /import '\.\/radar-freshness\.js'/);
  assert.match(worker, /'\/radar-freshness\.js'/);
});
