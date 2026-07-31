import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioApiClient } from '../../ui/PortfolioApiClient.js';

test('encode les identifiants et extrait data', async () => {
  const calls = [];
  const client = new PortfolioApiClient({
    baseUrl: 'https://example.test/',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, async json() { return { data: { portfolioId: 'p / 1' } }; } };
    }
  });
  const result = await client.loadPortfolio('p / 1');
  assert.equal(calls[0].url, 'https://example.test/portfolios/p%20%2F%201');
  assert.equal(result.portfolioId, 'p / 1');
});

test('conserve les réponses partielles d’import', async () => {
  const client = new PortfolioApiClient({
    fetchImpl: async () => ({ ok: false, status: 207, async json() { return { data: { complete: false, imported: [], errors: [{ index: 0 }] } }; } })
  });
  const result = await client.importTransactions('p-1', [{}]);
  assert.equal(result.complete, false);
});

test('normalise les erreurs HTTP', async () => {
  const client = new PortfolioApiClient({
    fetchImpl: async () => ({ ok: false, status: 400, async json() { return { error: { code: 'INVALID_REQUEST', message: 'Requête invalide' } }; } })
  });
  await assert.rejects(() => client.listPortfolios(), error => error.code === 'INVALID_REQUEST' && error.status === 400);
});
