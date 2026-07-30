import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Instrument } from '../../domain/instrument/Instrument.js';
import { JsonFileInstrumentRepository } from '../../infrastructure/instrument/JsonFileInstrumentRepository.js';

function createInstrument(id, name = id) {
  return new Instrument({
    id,
    type: Instrument.TYPES.ETF,
    name,
    isin: null,
    ticker: id.toUpperCase(),
    venue: 'XPAR',
    currency: 'EUR',
    providerMappings: [{ provider: 'twelve-data', symbol: `${id.toUpperCase()}:PARIS` }]
  });
}

async function temporaryCatalog(t) {
  const directory = await mkdtemp(join(tmpdir(), 'leynor-instruments-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return join(directory, 'catalog', 'instruments.json');
}

test('crée le fichier à la première écriture puis recharge les instruments', async t => {
  const filePath = await temporaryCatalog(t);
  const repository = await JsonFileInstrumentRepository.open({ filePath });

  await repository.save(createInstrument('cw8', 'MSCI World'));
  const payload = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(payload.version, 1);
  assert.equal(payload.instruments[0].id, 'cw8');

  const reloaded = await JsonFileInstrumentRepository.open({ filePath });
  assert.equal((await reloaded.findById('cw8')).name, 'MSCI World');
});

test('sérialise les écritures concurrentes sans perdre de données', async t => {
  const filePath = await temporaryCatalog(t);
  const repository = await JsonFileInstrumentRepository.open({ filePath });

  await Promise.all([
    repository.save(createInstrument('cw8')),
    repository.save(createInstrument('ewld')),
    repository.save(createInstrument('p500'))
  ]);
  await repository.flush();

  const reloaded = await JsonFileInstrumentRepository.open({ filePath });
  assert.deepEqual((await reloaded.search()).map(item => item.id), ['cw8', 'ewld', 'p500']);
});

test('persiste les suppressions et refuse un fichier corrompu', async t => {
  const filePath = await temporaryCatalog(t);
  const repository = await JsonFileInstrumentRepository.open({ filePath });
  await repository.save(createInstrument('cw8'));
  await repository.delete('cw8');

  const reloaded = await JsonFileInstrumentRepository.open({ filePath });
  assert.equal(await reloaded.findById('cw8'), null);

  await writeFile(filePath, '{invalid', 'utf8');
  await assert.rejects(() => JsonFileInstrumentRepository.open({ filePath }), SyntaxError);
});
