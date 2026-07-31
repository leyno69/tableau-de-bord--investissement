import test from 'node:test';
import assert from 'node:assert/strict';

import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';
import { createCorsHandler } from '../../runtime/server/createCorsHandler.js';

function responseDouble() {
  const headers = new Map();
  return {
    statusCode: 200,
    ended: false,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    writeHead(statusCode) { this.statusCode = statusCode; },
    end() { this.ended = true; },
    header(name) { return headers.get(name.toLowerCase()); }
  };
}

test('autorise uniquement l’origine GitHub Pages configurée', () => {
  const cors = createCorsHandler({ allowedOrigins: ['https://leyno69.github.io'] });
  const response = responseDouble();

  const handled = cors.apply({ method: 'GET', headers: { origin: 'https://leyno69.github.io' } }, response);

  assert.equal(handled, false);
  assert.equal(response.header('access-control-allow-origin'), 'https://leyno69.github.io');
  assert.equal(response.header('vary'), 'Origin');
  assert.match(response.header('access-control-allow-headers'), /authorization/);
});

test('répond au preflight sans exécuter le métier', () => {
  const cors = createCorsHandler({ allowedOrigins: ['https://leyno69.github.io'] });
  const response = responseDouble();

  const handled = cors.apply({ method: 'OPTIONS', headers: { origin: 'https://leyno69.github.io' } }, response);

  assert.equal(handled, true);
  assert.equal(response.statusCode, 204);
  assert.equal(response.ended, true);
});

test('ne renvoie aucun en-tête CORS à une origine inconnue', () => {
  const cors = createCorsHandler({ allowedOrigins: ['https://leyno69.github.io'] });
  const response = responseDouble();

  assert.equal(cors.apply({ method: 'GET', headers: { origin: 'https://example.com' } }, response), false);
  assert.equal(response.header('access-control-allow-origin'), undefined);
});

test('charge une liste d’origines immuable depuis l’environnement', () => {
  const config = loadServerConfig({
    CORS_ALLOWED_ORIGINS: 'https://leyno69.github.io, https://app.leynor.fr'
  });

  assert.deepEqual(config.cors.allowedOrigins, ['https://leyno69.github.io', 'https://app.leynor.fr']);
  assert.ok(Object.isFrozen(config.cors.allowedOrigins));
});

test('refuse les origines non sécurisées hors localhost', () => {
  assert.throws(
    () => createCorsHandler({ allowedOrigins: ['http://example.com'] }),
    /HTTPS/
  );
});
