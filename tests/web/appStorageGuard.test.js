import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appRuntime = await readFile(new URL('../../app.js', import.meta.url), 'utf8');

test('app.js ne lit ni n’écrit directement dans localStorage', () => {
  assert.doesNotMatch(appRuntime, /localStorage\.getItem/);
  assert.doesNotMatch(appRuntime, /localStorage\.setItem/);
  assert.match(appRuntime, /function browserStorage\(\)/);
  assert.match(appRuntime, /function safeGet\(key\)/);
  assert.match(appRuntime, /function safeSet\(key, value\)/);
});

test('le portefeuille et la watchlist sont normalisés avant le rendu', () => {
  assert.match(appRuntime, /normalizePortfolio/);
  assert.match(appRuntime, /normalizeWatchlist/);
  assert.match(appRuntime, /portfolio: load\(STORAGE_KEYS\.portfolio, defaultPortfolio, normalizePortfolio\)/);
  assert.match(appRuntime, /watchlist: load\(STORAGE_KEYS\.watchlist, defaultWatchlist, normalizeWatchlist\)/);
});

test('l’initialisation est protégée et signale son état', () => {
  assert.match(appRuntime, /function initializeApplication\(\)/);
  assert.match(appRuntime, /setBootPhase\('ready'\)/);
  assert.match(appRuntime, /recordBootError\(error, 'app\.initialize'\)/);
  assert.match(appRuntime, /DOMContentLoaded/);
});
