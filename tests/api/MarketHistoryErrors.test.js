import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../api/market-history.js', import.meta.url), 'utf8');

test('la route historique n’expose pas directement les erreurs du fournisseur', () => {
  assert.doesNotMatch(source, /json\(\{ error: data\.error/);
  assert.match(source, /providerError: data\.error \|\| null/);
  assert.match(source, /MARKET_PROVIDER_ERROR/);
});

test('la configuration absente et les erreurs techniques retournent un message public stable', () => {
  assert.match(source, /FINNHUB_API_KEY absente/);
  assert.match(source, /Données historiques temporairement indisponibles/);
  assert.match(source, /MARKET_HISTORY_UNAVAILABLE/);
  assert.match(source, /res\.status\(503\)/);
});

test('les limitations fournisseur et séries insuffisantes sont distinguées', () => {
  assert.match(source, /MARKET_PROVIDER_RATE_LIMITED/);
  assert.match(source, /MARKET_HISTORY_NOT_FOUND/);
  assert.match(source, /MARKET_HISTORY_INSUFFICIENT/);
  assert.match(source, /points\.length < 2/);
});
