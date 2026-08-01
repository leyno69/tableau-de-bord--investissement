import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const details = await readFile(new URL('../../asset-details.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../asset-details.css', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('les graphiques détaillés couvrent les périodes demandées', () => {
  for (const range of ['1H', '1J', '5J', '1S', '1M', '6M', '1A', 'MAX']) assert.match(details, new RegExp(`'${range}'`));
  assert.match(details, /market-chart/);
  assert.match(details, /Le graphique affiche uniquement les observations réellement enregistrées/);
});

test('les positions, le radar et le portefeuille ouvrent une fiche détaillée', () => {
  assert.match(details, /portfolioTable/);
  assert.match(details, /watchlist/);
  assert.match(details, /wealth-card/);
  assert.match(details, /fetchQuote/);
});

test('objectif et liquidités sont modifiables localement', () => {
  assert.match(details, /leynor-long-term-goal/);
  assert.match(details, /Nouvel objectif long terme/);
  assert.match(details, /Liquidités disponibles chez votre courtier/);
  assert.match(details, /data\.cash = amount/);
});

test('les ressources sont chargées et disponibles hors connexion', () => {
  assert.match(sync, /import '\.\/asset-details\.js'/);
  assert.match(worker, /'\/asset-details\.js'/);
  assert.match(worker, /'\/asset-details\.css'/);
  assert.match(styles, /asset-details-dialog/);
});
