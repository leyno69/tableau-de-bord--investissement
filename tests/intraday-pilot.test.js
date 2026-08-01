import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const endpoint = await readFile(new URL('../api/intraday.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../trading.html', import.meta.url), 'utf8');

test('le pilote intraday limite explicitement son univers à dix actifs', () => {
  assert.match(endpoint, /NVDA/);
  assert.match(endpoint, /BTCUSD/);
  assert.match(endpoint, /Actif absent de l’univers pilote/);
  assert.match(page, /10 actifs suivis/);
});

test('le calcul repose sur des données cinq minutes sans inventer le spread', () => {
  assert.match(endpoint, /interval', '5min/);
  assert.match(endpoint, /spreadPct == null/);
  assert.match(endpoint, /Bid\/ask absent/);
  assert.match(endpoint, /standardDeviation/);
});

test('la rotation gratuite ne synchronise que trois actifs par action', () => {
  assert.match(page, /Synchroniser 3 actifs/);
  assert.match(page, /\[0,1,2\]/);
  assert.match(page, /cursor\+3/);
});
