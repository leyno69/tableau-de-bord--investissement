import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { demoTrendSignals, trendCategories, rankTrendSignals } from '../../market-trends.js';

const html = await readFile(new URL('../../trends.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('expanded trends cover diversified sectors and megatrends', () => {
  assert.ok(trendCategories.length >= 18);
  assert.ok(demoTrendSignals.length >= 24);
  assert.ok(demoTrendSignals.some(signal => signal.category === 'Santé'));
  assert.ok(demoTrendSignals.some(signal => signal.category === 'Matières premières'));
  assert.ok(demoTrendSignals.some(signal => signal.category === 'Infrastructure numérique'));
  assert.ok(demoTrendSignals.some(signal => signal.theme === 'Mégatendance'));
});

test('ranking promotes favorites then score', () => {
  const ranked = rankTrendSignals(demoTrendSignals.slice(0, 4), { favorites: [demoTrendSignals[3].id] });
  assert.equal(ranked[0].id, demoTrendSignals[3].id);
  assert.ok(ranked.every(signal => Number.isInteger(signal.score)));
});

test('trends interface exposes search filters favorites and summaries', () => {
  assert.match(html, /id="trendSearch"/);
  assert.match(html, /id="categoryFilter"/);
  assert.match(html, /id="themeFilter"/);
  assert.match(html, /id="favoritesOnly"/);
  assert.match(html, /Score LEYNOR/);
  assert.match(html, /Radar des secteurs et mégatendances/);
});

test('expanded trends remain available in the refreshed PWA shell', () => {
  assert.match(worker, /leynor-shell-v\d+/);
  assert.match(worker, /'\/trends\.html'/);
  assert.match(worker, /'\/market-trends\.js'/);
});
