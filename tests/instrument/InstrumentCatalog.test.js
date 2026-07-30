import test from 'node:test';
import assert from 'node:assert/strict';

import { InstrumentCatalog } from '../../application/services/InstrumentCatalog.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { InstrumentCatalogHttpAdapter } from '../../interfaces/http/InstrumentCatalogHttpAdapter.js';

function input(overrides = {}) {
  return {
    id: 'asset-cw8',
    type: 'etf',
    name: 'Amundi MSCI World',
    isin: 'LU1681043599',
    ticker: 'CW8',
    venue: 'XPAR',
    currency: 'EUR',
    providerMappings: [{ provider: 'twelve-data', symbol: 'CW8:PARIS' }],
    ...overrides
  };
}

test('crée, recherche, met à jour et supprime un instrument', async () => {
  const catalog = new InstrumentCatalog({ instrumentRepository: new InMemoryInstrumentRepository() });
  assert.equal((await catalog.create(input())).id, 'asset-cw8');
  assert.equal((await catalog.search('world')).length, 1);
  assert.equal((await catalog.update('asset-cw8', { name: 'World ETF' })).name, 'World ETF');
  assert.equal((await catalog.replaceProviderMappings('asset-cw8', [{ provider: 'twelve-data', symbol: 'CW8:EPA' }])).providerMappings[0].symbol, 'CW8:EPA');
  await catalog.remove('asset-cw8');
  await assert.rejects(() => catalog.get('asset-cw8'), error => error.code === 'INSTRUMENT_NOT_FOUND');
});

test('expose les opérations du catalogue par HTTP', async () => {
  const adapter = new InstrumentCatalogHttpAdapter({
    catalog: new InstrumentCatalog({ instrumentRepository: new InMemoryInstrumentRepository() })
  });
  const created = await adapter.handle({ method: 'POST', path: '/instruments', body: input() });
  assert.equal(created.statusCode, 201);
  const listed = await adapter.handle({ method: 'GET', path: '/instruments', query: { q: 'cw8' } });
  assert.equal(listed.body.data.length, 1);
  const updated = await adapter.handle({ method: 'PUT', path: '/instruments/asset-cw8/provider-mappings', body: { providerMappings: [{ provider: 'twelve-data', symbol: 'CW8:EPA' }] } });
  assert.equal(updated.body.data.providerMappings[0].symbol, 'CW8:EPA');
  const removed = await adapter.handle({ method: 'DELETE', path: '/instruments/asset-cw8' });
  assert.equal(removed.statusCode, 204);
});
