import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const details = await readFile(new URL('../../asset-details.js', import.meta.url), 'utf8');
const market = await readFile(new URL('../../market.js', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');

test('les fiches actif exposent toutes les périodes demandées', () => {
  for (const range of ['1H', '1J', '5J', '1S', '1M', '6M', '1A', 'MAX']) {
    assert.match(details, new RegExp(`'${range}'`));
  }
  assert.match(details, /fetchDailyHistory/);
  assert.match(details, /Historique quotidien EODHD contrôlé/);
});

test('le portefeuille et les cartes radar ouvrent une fiche détaillée', () => {
  assert.match(details, /portfolioTable/);
  assert.match(details, /watchlist/);
  assert.match(details, /wealth-card/);
  assert.match(details, /openDetails/);
});

test('objectif et liquidités peuvent être modifiés localement', () => {
  assert.match(details, /leynor-long-term-goal/);
  assert.match(details, /Liquidités disponibles chez votre courtier/);
  assert.match(details, /data\.cash = value/);
  assert.match(details, /valeur locale — cliquez pour corriger/);
});

test('le client historique utilise la fonction serveur auditée', () => {
  assert.match(market, /\.netlify\/functions\/historical-eod/);
  assert.match(market, /data\.provenance/);
  assert.match(sync, /import '\.\/asset-details\.js'/);
});
