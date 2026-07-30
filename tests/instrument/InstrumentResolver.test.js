import test from 'node:test';
import assert from 'node:assert/strict';

import { Instrument } from '../../domain/instrument/Instrument.js';
import { InstrumentResolver, InstrumentResolutionError } from '../../application/services/InstrumentResolver.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { ResolvingMarketPriceProvider } from '../../infrastructure/market/ResolvingMarketPriceProvider.js';

function instrument(overrides = {}) {
  return new Instrument({
    id: 'asset-msci-world',
    type: Instrument.TYPES.ETF,
    name: 'MSCI World ETF',
    isin: 'LU1781541179',
    ticker: 'CW8',
    venue: 'XPAR',
    currency: 'EUR',
    providerMappings: [{ provider: 'twelve-data', symbol: 'CW8:PARIS', externalId: 'td-cw8' }],
    ...overrides
  });
}

test('résout un identifiant interne, un ISIN et un ticker vers le symbole fournisseur', async () => {
  const resolver = new InstrumentResolver({
    instrumentRepository: new InMemoryInstrumentRepository([instrument()]),
    provider: 'twelve-data',
    clock: () => new Date('2026-07-31T00:00:00Z')
  });

  const resolution = await resolver.resolve('asset-msci-world');
  assert.equal(resolution.symbol, 'CW8:PARIS');
  assert.equal(resolution.externalId, 'td-cw8');
  assert.equal(await resolver.resolveSymbol('LU1781541179'), 'CW8:PARIS');
  assert.equal(await resolver.resolveSymbol('cw8'), 'CW8:PARIS');
});

test('signale les instruments absents, ambigus et sans mapping fournisseur', async () => {
  const repository = new InMemoryInstrumentRepository([
    instrument(),
    instrument({ id: 'asset-other', isin: null, ticker: 'CW8', name: 'Other' })
  ]);
  const resolver = new InstrumentResolver({ instrumentRepository: repository, provider: 'twelve-data' });

  await assert.rejects(() => resolver.resolve('unknown'), error => error instanceof InstrumentResolutionError && error.code === 'INSTRUMENT_NOT_FOUND');
  await assert.rejects(() => resolver.resolve('CW8'), error => error instanceof InstrumentResolutionError && error.code === 'INSTRUMENT_AMBIGUOUS');

  const missing = new InstrumentResolver({
    instrumentRepository: new InMemoryInstrumentRepository([instrument({ providerMappings: [{ provider: 'other', symbol: 'CW8' }] })]),
    provider: 'twelve-data'
  });
  await assert.rejects(() => missing.resolve('asset-msci-world'), error => error.code === 'PROVIDER_SYMBOL_NOT_FOUND');
});

test('décore un fournisseur de marché sans lui exposer les identifiants internes', async () => {
  const resolver = new InstrumentResolver({ instrumentRepository: new InMemoryInstrumentRepository([instrument()]), provider: 'twelve-data' });
  const calls = [];
  const provider = new ResolvingMarketPriceProvider({
    instrumentResolver: resolver,
    marketPriceProvider: { async getPrice(symbol) { calls.push(symbol); return symbol; } }
  });

  assert.equal(await provider.getPrice('LU1781541179'), 'CW8:PARIS');
  assert.deepEqual(calls, ['CW8:PARIS']);
});
