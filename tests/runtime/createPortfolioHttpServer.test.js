import test from 'node:test';
import assert from 'node:assert/strict';

import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';
import { createBootstrapProviders } from '../../runtime/providers/createBootstrapProviders.js';
import { createPortfolioHttpServer } from '../../runtime/server/createPortfolioHttpServer.js';

test('loadServerConfig applique les valeurs par défaut et valide les nombres', () => {
  const config = loadServerConfig({});
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3000);
  assert.equal(config.maxBodyBytes, 1_000_000);
  assert.throws(() => loadServerConfig({ PORT: 'abc' }), /PORT/);
});

test('le serveur expose health, ready et peut être arrêté proprement', async () => {
  const runtime = createPortfolioHttpServer({
    config: loadServerConfig({ PORT: '0', HOST: '127.0.0.1', SHUTDOWN_TIMEOUT_MS: '1000' }),
    providers: createBootstrapProviders(),
    logger: {}
  });

  const started = await runtime.start();
  const baseUrl = `http://127.0.0.1:${started.port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const ready = await fetch(`${baseUrl}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: 'ready' });

  await runtime.stop();
  assert.equal(runtime.server.listening, false);
});

test('le serveur délègue les routes métier à la façade HTTP', async () => {
  const runtime = createPortfolioHttpServer({
    config: loadServerConfig({ PORT: '0', HOST: '127.0.0.1' }),
    providers: createBootstrapProviders(),
    logger: {}
  });

  const started = await runtime.start();
  const response = await fetch(`http://127.0.0.1:${started.port}/portfolios/portfolio-1`, {
    method: 'GET'
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.portfolioId, 'portfolio-1');
  assert.deepEqual(payload.data.transactions, []);

  await runtime.stop();
});
