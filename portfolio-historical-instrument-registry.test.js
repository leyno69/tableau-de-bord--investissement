import test from 'node:test';
import assert from 'node:assert/strict';
import {
  historicalInstrumentRegistryV1,
  findHistoricalInstrumentRegistryEntry,
  auditInstrumentRegistryForPresetTickers,
} from './portfolio-historical-instrument-registry.js';

test('le registre contient les quatre tickers présents dans les presets', () => {
  assert.deepEqual(historicalInstrumentRegistryV1.map(entry => entry.sourceTicker), ['WPEA', 'PAEJ', 'NVDA', 'SMH']);
});

test('WPEA, PAEJ et NVDA sont identifiés avec une date de début vérifiée', () => {
  for (const ticker of ['WPEA', 'PAEJ', 'NVDA']) {
    const entry = findHistoricalInstrumentRegistryEntry(ticker);
    assert.equal(entry.status, 'identified');
    assert.match(entry.inceptionDate, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('SMH reste bloqué tant que le produit US ou UCITS n’est pas choisi explicitement', () => {
  const entry = findHistoricalInstrumentRegistryEntry('SMH');
  assert.equal(entry.status, 'ambiguous');
  assert.equal(entry.candidates.length, 2);

  const audit = auditInstrumentRegistryForPresetTickers(['WPEA', 'PAEJ', 'NVDA', 'SMH']);
  assert.equal(audit.ready, false);
  assert.deepEqual(audit.entries.at(-1), {
    ticker: 'SMH', status: 'blocked', blocker: 'instrument-identity-ambiguous',
  });
});

test('un ticker absent du registre est refusé explicitement', () => {
  const audit = auditInstrumentRegistryForPresetTickers(['UNKNOWN']);
  assert.deepEqual(audit.entries[0], {
    ticker: 'UNKNOWN', status: 'missing', blocker: 'instrument-not-registered',
  });
});
