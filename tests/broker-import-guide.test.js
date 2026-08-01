import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const guide = await readFile(new URL('../broker-import-guide.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../broker-import-guide.css', import.meta.url), 'utf8');
const brokerImport = await readFile(new URL('../broker-import.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

test('le centre d’import charge le guide courtier', () => {
  assert.match(brokerImport, /import '\.\/broker-import-guide\.js'/);
  assert.match(guide, /Comment récupérer mon fichier/);
  assert.match(guide, /Trade Republic/);
  assert.match(guide, /Revolut/);
});

test('le guide rappelle les règles de sécurité et la validation', () => {
  assert.match(guide, /mot de passe/);
  assert.match(guide, /code PIN/);
  assert.match(guide, /Aucune donnée n’est appliquée automatiquement/);
  assert.match(guide, /Repères visuels/);
});

test('le guide possède des captures illustrées responsives', () => {
  assert.match(guide, /guide-phone/);
  assert.match(styles, /\.guide-phone/);
  assert.match(styles, /@media\(max-width:760px\)/);
});

test('le guide est disponible hors connexion dans le cache courant', () => {
  assert.match(serviceWorker, /leynor-shell-v(?:19|[2-9]\d+)/);
  assert.match(serviceWorker, /broker-import-guide\.js/);
  assert.match(serviceWorker, /broker-import-guide\.css/);
});
