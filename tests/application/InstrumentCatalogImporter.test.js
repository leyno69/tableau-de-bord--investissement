import test from 'node:test';
import assert from 'node:assert/strict';

import { InstrumentCatalogImporter } from '../../application/services/InstrumentCatalogImporter.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';

function input(id = 'asset-cw8') {
  return { id, type: 'etf', name: 'Amundi MSCI World', isin: 'LU1681043599', ticker: 'CW8', venue: 'XPAR', currency: 'EUR', providerMappings: [] };
}

test('valide tout l’import avant la première écriture', async () => {
  const repository = new InMemoryInstrumentRepository();
  const importer = new InstrumentCatalogImporter({ instrumentRepository: repository });
  const report = await importer.import({ format: 'json', content: [input(), { ...input('bad'), type: 'unknown' }] });
  assert.equal(report.accepted, 1);
  assert.equal(report.rejected, 1);
  assert.equal(report.applied, 0);
  assert.equal(await repository.findById('asset-cw8'), null);
});

test('importe du JSON en simulation puis réellement', async () => {
  const repository = new InMemoryInstrumentRepository();
  const importer = new InstrumentCatalogImporter({ instrumentRepository: repository });
  const dryRun = await importer.import({ content: { instruments: [input()] }, dryRun: true });
  assert.equal(dryRun.applied, 0);
  assert.equal(await repository.findById('asset-cw8'), null);
  const report = await importer.import({ content: [input()] });
  assert.equal(report.applied, 1);
  assert.equal((await repository.findById('asset-cw8')).ticker, 'CW8');
});

test('gère les politiques skip et replace', async () => {
  const repository = new InMemoryInstrumentRepository();
  const importer = new InstrumentCatalogImporter({ instrumentRepository: repository });
  await importer.import({ content: [input()] });
  const skipped = await importer.import({ content: [input()], duplicatePolicy: 'skip' });
  assert.equal(skipped.entries[0].action, 'skipped');
  const replaced = await importer.import({ content: [{ ...input(), name: 'Nouveau nom' }], duplicatePolicy: 'replace' });
  assert.equal(replaced.entries[0].action, 'replaced');
  assert.equal((await repository.findById('asset-cw8')).name, 'Nouveau nom');
});

test('importe un CSV avec mappings JSON', async () => {
  const repository = new InMemoryInstrumentRepository();
  const importer = new InstrumentCatalogImporter({ instrumentRepository: repository });
  const csv = 'id,type,name,isin,ticker,venue,currency,providerMappings\nasset-cw8,etf,World,LU1681043599,CW8,XPAR,EUR,"[{""provider"":""twelve-data"",""symbol"":""CW8:PARIS""}]"';
  const report = await importer.import({ format: 'csv', content: csv });
  assert.equal(report.applied, 1);
  assert.equal((await repository.findById('asset-cw8')).providerMappings[0].symbol, 'CW8:PARIS');
});
