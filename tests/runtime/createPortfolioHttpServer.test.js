import test from 'node:test';
import assert from 'node:assert/strict';

import { loadServerConfig } from '../../runtime/config/loadServerConfig.js';
import { createBootstrapProviders } from '../../runtime/providers/createBootstrapProviders.js';
import { createDeploymentFingerprint, createPortfolioHttpServer } from '../../runtime/server/createPortfolioHttpServer.js';

test('loadServerConfig applique les valeurs par défaut et valide les nombres', () => {
  const config = loadServerConfig({});
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.port, 3000);
  assert.equal(config.maxBodyBytes, 1_000_000);
  assert.throws(() => loadServerConfig({ PORT: 'abc' }), /PORT/);
});

test('le serveur expose health, ready, version et peut être arrêté proprement', async () => {
  const deploymentEnvironment = {
    RAILWAY_GIT_COMMIT_SHA: '820d6a4532ab5c6aa1750d015c8794aee2d608f3',
    RAILWAY_PROJECT_ID: 'project-1',
    RAILWAY_SERVICE_ID: 'service-1',
    RAILWAY_ENVIRONMENT_ID: 'environment-1',
    RAILWAY_SERVICE_NAME: 'production',
    RAILWAY_PUBLIC_DOMAIN: 'example.up.railway.app',
    RAILWAY_DEPLOYMENT_ID: 'deployment-1',
    NODE_ENV: 'production'
  };
  const runtime = createPortfolioHttpServer({
    config: loadServerConfig({ PORT: '0', HOST: '127.0.0.1', SHUTDOWN_TIMEOUT_MS: '1000' }),
    providers: createBootstrapProviders(),
    logger: {},
    deploymentEnvironment
  });

  const started = await runtime.start();
  const baseUrl = `http://127.0.0.1:${started.port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const ready = await fetch(`${baseUrl}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: 'ready' });

  const version = await fetch(`${baseUrl}/version`);
  assert.equal(version.status, 200);
  const fingerprint = await version.json();
  assert.equal(fingerprint.application, 'LEYNOR AI');
  assert.equal(fingerprint.platform, 'railway');
  assert.equal(fingerprint.commit, deploymentEnvironment.RAILWAY_GIT_COMMIT_SHA);
  assert.equal(fingerprint.commitShort, '820d6a4532ab');
  assert.equal(fingerprint.serviceId, 'service-1');
  assert.equal(fingerprint.publicDomain, 'example.up.railway.app');
  assert.match(fingerprint.startedAt, /^\d{4}-\d{2}-\d{2}T/);

  const index = await fetch(`${baseUrl}/index.html`);
  assert.equal(index.status, 200);
  assert.equal(index.headers.get('x-leynor-commit'), deploymentEnvironment.RAILWAY_GIT_COMMIT_SHA);
  assert.equal(index.headers.get('x-leynor-service'), 'service-1');
  assert.match(index.headers.get('cache-control'), /no-store/);

  await runtime.stop();
  assert.equal(runtime.server.listening, false);
});

test('createDeploymentFingerprint reste explicite hors plateforme connue', () => {
  assert.deepEqual(createDeploymentFingerprint({ deploymentEnvironment: {}, startedAt: '2026-08-03T00:00:00.000Z' }), {
    application: 'LEYNOR AI',
    commit: 'unknown',
    commitShort: 'unknown',
    platform: 'unknown',
    projectId: null,
    serviceId: null,
    environmentId: null,
    serviceName: null,
    publicDomain: null,
    deploymentId: null,
    nodeEnvironment: null,
    startedAt: '2026-08-03T00:00:00.000Z'
  });
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
