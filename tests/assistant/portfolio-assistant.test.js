import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolioReply, loadPortfolioFromStorage } from '../../portfolio-assistant.js';

const portfolio = {
  cash: 500,
  positions: [
    { quantity: 10, avgPrice: 80, price: 100, region: 'Monde' },
    { quantity: 2, avgPrice: 100, price: 100, region: 'Asie' }
  ]
};

test('analyse la concentration depuis les positions réelles', () => {
  const reply = buildPortfolioReply('Analyse la concentration de mon portefeuille', portfolio);
  assert.match(reply, /Monde représente 83,3 %/);
  assert.match(reply, /concentration est élevée/);
});

test('utilise les liquidités réelles pour répondre', () => {
  const reply = buildPortfolioReply('Que puis-je renforcer avec mes liquidités ?', portfolio);
  assert.match(reply, /500/);
  assert.match(reply, /renforcement progressif/);
});

test('charge le portefeuille depuis un storage compatible', () => {
  const storage = { getItem: () => JSON.stringify(portfolio) };
  assert.deepEqual(loadPortfolioFromStorage(storage), portfolio);
});

test('retourne un portefeuille vide lorsque le stockage est invalide', () => {
  const storage = { getItem: () => '{invalide' };
  assert.deepEqual(loadPortfolioFromStorage(storage), { cash: 0, positions: [] });
});
