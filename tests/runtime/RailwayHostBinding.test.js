import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';

test('le serveur écoute toutes les interfaces par défaut pour les plateformes conteneurisées', () => {
  const config = loadServerConfig({});
  assert.equal(config.host, '0.0.0.0');
});

test('HOST explicite reste prioritaire pour le développement et les tests', () => {
  const config = loadServerConfig({ HOST: '127.0.0.1' });
  assert.equal(config.host, '127.0.0.1');
});
