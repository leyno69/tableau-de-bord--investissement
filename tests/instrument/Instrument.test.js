import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Instrument
} from '../../domain/instrument/Instrument.js';

const validInstrumentProperties = {
  id: 'instrument-wpea',
  type: Instrument.TYPES.ETF,
  name: 'Amundi PEA Monde MSCI World',
  isin: 'IE0002XZSHO1',
  ticker: 'WPEA',
  venue: 'XPAR',
  currency: 'EUR',
  providerMappings: [
    {
      provider: 'eodhd',
      symbol: 'WPEA.PA',
      externalId: null,
      validFrom: '2024-03-01T00:00:00.000Z',
      validTo: null
    }
  ]
};

test('crée un instrument avec une identité interne stable', () => {
  const instrument = new Instrument(validInstrumentProperties);

  assert.equal(instrument.id, 'instrument-wpea');
  assert.equal(instrument.type, Instrument.TYPES.ETF);
  assert.equal(instrument.isin, 'IE0002XZSHO1');
  assert.equal(instrument.ticker, 'WPEA');
  assert.equal(instrument.providerMappings[0].symbol, 'WPEA.PA');
});

test('normalise l’ISIN et la devise en majuscules', () => {
  const instrument = new Instrument({
    ...validInstrumentProperties,
    isin: 'ie0002xzsho1',
    currency: 'eur'
  });

  assert.equal(instrument.isin, 'IE0002XZSHO1');
  assert.equal(instrument.currency, 'EUR');
});

test('retrouve le mapping fournisseur actif', () => {
  const instrument = new Instrument(validInstrumentProperties);

  assert.deepEqual(
    instrument.getProviderMapping('eodhd'),
    instrument.providerMappings[0]
  );
});

test('retrouve un mapping fournisseur à une date historique', () => {
  const instrument = new Instrument({
    ...validInstrumentProperties,
    providerMappings: [
      {
        provider: 'eodhd',
        symbol: 'OLD.PA',
        validFrom: '2023-01-01T00:00:00.000Z',
        validTo: '2024-03-01T00:00:00.000Z'
      },
      {
        provider: 'eodhd',
        symbol: 'WPEA.PA',
        validFrom: '2024-03-01T00:00:00.000Z',
        validTo: null
      }
    ]
  });

  assert.equal(
    instrument.getProviderMapping(
      'eodhd',
      '2023-06-01T00:00:00.000Z'
    ).symbol,
    'OLD.PA'
  );
  assert.equal(
    instrument.getProviderMapping(
      'eodhd',
      '2025-01-01T00:00:00.000Z'
    ).symbol,
    'WPEA.PA'
  );
});

test('refuse les périodes de mappings qui se chevauchent', () => {
  assert.throws(
    () => new Instrument({
      ...validInstrumentProperties,
      providerMappings: [
        {
          provider: 'eodhd',
          symbol: 'FIRST.PA',
          validFrom: '2023-01-01T00:00:00.000Z',
          validTo: '2024-06-01T00:00:00.000Z'
        },
        {
          provider: 'eodhd',
          symbol: 'SECOND.PA',
          validFrom: '2024-03-01T00:00:00.000Z',
          validTo: null
        }
      ]
    }),
    /ne doivent pas se chevaucher/
  );
});

test('refuse un ISIN invalide', () => {
  assert.throws(
    () => new Instrument({
      ...validInstrumentProperties,
      isin: 'WPEA'
    }),
    /format ISO 6166/
  );
});

test('rend l’instrument et ses mappings immuables', () => {
  const instrument = new Instrument(validInstrumentProperties);

  assert.equal(Object.isFrozen(instrument), true);
  assert.equal(Object.isFrozen(instrument.providerMappings), true);
  assert.equal(Object.isFrozen(instrument.providerMappings[0]), true);

  assert.throws(() => {
    instrument.ticker = 'OTHER';
  }, TypeError);
});

test('produit une représentation sérialisable indépendante', () => {
  const instrument = new Instrument(validInstrumentProperties);
  const serialized = instrument.toJSON();

  assert.deepEqual(serialized, validInstrumentProperties);
  assert.notEqual(serialized, instrument);
  assert.notEqual(
    serialized.providerMappings,
    instrument.providerMappings
  );
});
