import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { openJsonFilePortfolioRepositories } from '../../infrastructure/persistence/JsonFilePortfolioRepositories.js';
import { createPortfolioHttpServer } from '../../runtime/server/createPortfolioHttpServer.js';

const TOKEN = 'runtime-e2e-secret';

test('le serveur conserve un parcours utilisateur complet après redémarrage', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'leynor-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'portfolios.json');

  const firstRepositories = await openJsonFilePortfolioRepositories({ filePath });
  const firstRuntime = createRuntime(firstRepositories);
  t.after(() => firstRuntime.stop());
  await firstRuntime.start();
  const firstBaseUrl = baseUrl(firstRuntime);

  assert.equal((await request(firstBaseUrl, 'POST', '/portfolios', {
    id: 'portfolio-main', name: 'Portefeuille principal', baseCurrency: 'EUR'
  })).status, 201);

  assert.equal((await request(firstBaseUrl, 'POST', '/portfolios/portfolio-main/accounts', {
    id: 'account-pea', name: 'PEA Trade Republic', providerId: 'trade-republic',
    kind: 'SECURITIES', taxWrapper: 'PEA', currency: 'EUR'
  })).status, 201);

  assert.equal((await request(firstBaseUrl, 'PUT', '/portfolios/portfolio-main/preferences', {
    baseCurrency: 'EUR', periodsPerYear: 252
  })).status, 200);

  assert.equal((await request(firstBaseUrl, 'POST', '/portfolios/portfolio-main/transactions', {
    id: 'tx-world-1', accountId: 'account-pea', assetId: 'world-etf', type: 'buy',
    quantity: 2, unitPrice: 100, currency: 'EUR', executedAt: '2026-07-31',
    createdAt: '2026-07-31T06:00:00.000Z'
  })).status, 201);

  await firstRuntime.stop();

  const secondRepositories = await openJsonFilePortfolioRepositories({ filePath });
  const secondRuntime = createRuntime(secondRepositories);
  t.after(() => secondRuntime.stop());
  await secondRuntime.start();
  const secondBaseUrl = baseUrl(secondRuntime);

  const portfolios = await request(secondBaseUrl, 'GET', '/portfolios');
  assert.equal(portfolios.status, 200);
  assert.equal(portfolios.body.data[0].id, 'portfolio-main');

  const accounts = await request(secondBaseUrl, 'GET', '/portfolios/portfolio-main/accounts');
  assert.equal(accounts.status, 200);
  assert.equal(accounts.body.data[0].id, 'account-pea');

  const state = await request(secondBaseUrl, 'GET', '/portfolios/portfolio-main');
  assert.equal(state.status, 200);
  assert.equal(state.body.data.transactions.length, 1);
  assert.equal(state.body.data.preferences.baseCurrency, 'EUR');
});

function createRuntime(repositories) {
  return createPortfolioHttpServer({
    config: {
      host: '127.0.0.1', port: 0, maxBodyBytes: 100_000,
      shutdownTimeoutMilliseconds: 1_000, authToken: TOKEN
    },
    providers: {
      marketPriceProvider: { async getPrice() { return 100; } },
      exchangeRateProvider: { async getRate() { return 1; } },
      assetClassificationProvider: { async getClassification() { return { category: 'ETF' }; } }
    },
    repositories,
    logger: { info() {}, error() {} }
  });
}

function baseUrl(runtime) {
  const address = runtime.address();
  return `http://127.0.0.1:${address.port}`;
}

async function request(baseUrl, method, path, body = undefined) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, body: await response.json() };
}
