import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

test('le tableau principal ne dépend pas statiquement de l’assistant', () => {
  assert.doesNotMatch(appSource, /^import\s+['"]\.\/assistant-ui\.js['"];?/m);
  assert.match(appSource, /renderBrokerControls\(\);\s*renderAll\(\);\s*setupDialogs\(\);/);
});

test('les champs dynamiques de l’accueil restent identifiables', () => {
  for (const id of ['brokerSelect', 'portfolioValue', 'portfolioMove', 'investedValue', 'pnlValue', 'cashValue']) {
    assert.match(indexSource, new RegExp(`id=["']${id}["']`));
  }
});
