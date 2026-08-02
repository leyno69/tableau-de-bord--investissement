import test from 'node:test';
import assert from 'node:assert/strict';
import { auditProviderCapabilities } from './MarketDataProvider.js';
import { CsvMarketDataProvider } from './CsvMarketDataProvider.js';

const csvText = `symbol,date,open,high,low,close,volume,availableAt
AAA,2020-01-02,10,12,9,11,1000,2020-01-02
BBB,2020-01-02,20,22,19,21,2000,2020-01-02
AAA,2020-01-03,11,13,10,12,1200,2020-01-03`;

function createProvider(overrides = {}) {
  return new CsvMarketDataProvider({
    csvText,
    metadata: {
      sourceId: 'local-fixture',
      licence: 'test-only',
      fingerprint: 'sha256:test-fixture',
      pointInTime: true,
      revisions: false,
      delistedEntities: false,
      ...overrides,
    },
  });
}

test('importe et filtre des prix CSV de façon déterministe', async () => {
  const provider = createProvider();
  const records = await provider.fetchPrices({
    symbols: ['AAA'],
    startDate: '2020-01-02',
    endDate: '2020-01-03',
  });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.close), [11, 12]);
  assert.equal(Object.isFrozen(records), true);
  assert.deepEqual(records, await provider.fetchPrices({ symbols: ['AAA'], startDate: '2020-01-02', endDate: '2020-01-03' }));
});

test('expose les métadonnées de provenance sans les modifier', async () => {
  const metadata = await createProvider().fetchMetadata();
  assert.equal(metadata.sourceId, 'local-fixture');
  assert.equal(metadata.pointInTime, true);
  assert.equal(Object.isFrozen(metadata), true);
});

test('audite les capacités requises sans déclarer de validation', () => {
  const audit = auditProviderCapabilities(createProvider(), {
    prices: true,
    pointInTime: true,
    delistedEntities: true,
  });
  assert.equal(audit.eligible, false);
  assert.deepEqual(audit.missing, ['delistedEntities']);
  assert.equal(audit.readyForExternalValidation, false);
  assert.equal(audit.readyForProduction, false);
});

test('refuse les dates invalides et les intervalles inversés', async () => {
  const provider = createProvider();
  await assert.rejects(
    provider.fetchPrices({ symbols: ['AAA'], startDate: '2020-02-01', endDate: '2020-01-01' }),
    /startDate must be before/,
  );
});

test('refuse une ligne dont le nombre de colonnes est incohérent', async () => {
  const provider = new CsvMarketDataProvider({
    csvText: 'symbol,date,open,high,low,close,volume,availableAt\nAAA,2020-01-01,1',
    metadata: {
      sourceId: 'invalid-fixture',
      licence: 'test-only',
      fingerprint: 'sha256:invalid',
    },
  });
  await assert.rejects(
    provider.fetchPrices({ symbols: ['AAA'], startDate: '2020-01-01', endDate: '2020-01-02' }),
    /invalid column count/,
  );
});

test('ne prétend pas fournir des corporate actions absentes', async () => {
  assert.deepEqual(await createProvider().fetchCorporateActions(), []);
});
