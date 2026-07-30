import test from 'node:test';
import assert from 'node:assert/strict';

import { Instrument } from '../../domain/instrument/Instrument.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { createBootstrapProviders } from '../../runtime/providers/createBootstrapProviders.js';

function response(payload) {
  return Promise.resolve({ ok: true, status: 200, async json() { return payload; } });
}

test('Twelve Data reçoit le symbole administré au lieu de l’assetId interne', async () => {
  const repository = new InMemoryInstrumentRepository([
    new Instrument({
      id: 'asset-cw8', type: Instrument.TYPES.ETF, name: 'Amundi MSCI World',
      isin: 'LU1681043599', ticker: 'CW8', venue: 'XPAR', currency: 'EUR',
      providerMappings: [{ provider: 'twelve-data', symbol: 'CW8:PARIS' }]
    })
  ]);
  const urls = [];
  const providers = createBootstrapProviders({
    market: { provider: 'twelve-data', apiKey: 'secret', baseUrl: 'https://example.test', timeoutMilliseconds: 1000, cacheTtlMilliseconds: 0 },
    instrumentRepository: repository,
    fetchImplementation: async url => {
      urls.push(String(url));
      return response({ close: '540.25', currency: 'EUR', timestamp: 1785456000, exchange: 'PARIS' });
    }
  });

  const price = await providers.marketPriceProvider.getPrice('asset-cw8');
  assert.equal(price.amount, 540.25);
  assert.equal(new URL(urls[0]).searchParams.get('symbol'), 'CW8:PARIS');
});

test('le runtime refuse Twelve Data sans dépôt d’instruments', () => {
  assert.throws(() => createBootstrapProviders({ market: { provider: 'twelve-data', apiKey: 'secret' } }), /instrumentRepository/);
});
