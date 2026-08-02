import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const model = await readFile(new URL('../../opportunity-radar.js', import.meta.url), 'utf8');
const ui = await readFile(new URL('../../opportunity-radar-v2.js', import.meta.url), 'utf8');
const data = await readFile(new URL('../../thematic-radar-data.js', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');

test('opportunity cards distinguish themes from listed assets', () => {
  assert.match(model, /kind: kind === 'asset' \? 'asset' : 'theme'/);
  assert.match(model, /id: signal\.id/);
});

test('score, confidence and proof are displayed as distinct concepts', () => {
  assert.match(ui, /Score : non calculé/);
  assert.match(ui, /niveau de confiance/);
  assert.match(ui, /niveau de preuve provisoire/);
  assert.match(ui, /Aucune méthodologie validée ne permet encore d’afficher un score/);
  assert.doesNotMatch(ui, /Score\s*:\s*\$\{Math\.round\(card\.confidence/);
});

test('theme metrics are never copied to representative assets', () => {
  assert.match(ui, /Aucun score thématique n’est copié/);
  assert.doesNotMatch(ui, /asset\.confidence/);
  assert.doesNotMatch(ui, /asset\.score/);
});

test('the explanation action uses the approved product wording', () => {
  assert.match(ui, /Pourquoi LEYNOR pense cela \?/);
  assert.match(ui, /Fraîcheur des données/);
});

test('representative assets open only real market sheets', () => {
  assert.match(ui, /openDetails\(\{\.\.\.asset,price:null,change:null\}\)/);
  assert.match(data, /marketSymbol: 'NVDA'/);
  assert.match(data, /marketSymbol: 'EQIX'/);
  assert.match(data, /marketSymbol: 'AIR\.PA'/);
});

test('runtime loads thematic radar v2', () => {
  assert.match(sync, /import '\.\/opportunity-radar-v2\.js'/);
  assert.doesNotMatch(sync, /opportunity-radar-ui\.js/);
});
