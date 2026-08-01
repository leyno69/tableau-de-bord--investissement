import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../mobile-experience-fixes.js', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');
const details = await readFile(new URL('../../asset-details.js', import.meta.url), 'utf8');

test('le bouton de compte mobile reste visible et restaure le profil local', () => {
  assert.match(source, /Connexion à mon compte/);
  assert.match(source, /dataset\.mobileAccount/);
  assert.match(source, /@media \(max-width:680px\)/);
  assert.match(source, /restorePrivateProfile/);
});

test('la préférence de voix est imposée à chaque synthèse', () => {
  assert.match(source, /leynor-voice-settings/);
  assert.match(source, /utterance\.voice = selected/);
  assert.match(source, /voiceschanged/);
  assert.match(source, /male/);
  assert.match(source, /female/);
});

test('les cartes de marché génériques ouvrent la fiche graphique', () => {
  assert.match(source, /\.opportunity-card/);
  assert.match(source, /\.trend-card/);
  assert.match(source, /import\('\.\/asset-details\.js'\)/);
  assert.match(details, /export \{ RANGES, openDetails/);
});

test('le correctif est chargé par le runtime principal', () => {
  assert.match(sync, /import '\.\/mobile-experience-fixes\.js';/);
});
