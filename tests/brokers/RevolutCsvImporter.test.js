import test from 'node:test';
import assert from 'node:assert/strict';

import { RevolutCsvImporter } from '../../infrastructure/brokers/revolut/RevolutCsvImporter.js';

test('importe les opérations Revolut avec devise et frais', () => {
  const csv = `Date completed,Type,Ticker,Quantity,Price per share,Total amount,Fee,Currency,Transaction ID
2026-07-01 10:00:00,Market Buy,NVDA,0.5,120.00,60.00,1.00,USD,rv-1
2026-07-15 10:00:00,Dividend,NVDA,0,0,2.50,0.10,USD,rv-2`;
  const importer = new RevolutCsvImporter({ clock: () => new Date('2026-07-31T05:00:00.000Z') });
  const result = importer.import({ csv, portfolioId: 'p-1', accountId: 'a-rv' });
  assert.equal(result[0].id, 'revolut:rv-1');
  assert.equal(result[0].type, 'buy');
  assert.equal(result[0].quantity, 0.5);
  assert.equal(result[0].currency, 'USD');
  assert.equal(result[0].fees, 1);
  assert.equal(result[1].type, 'dividend');
  assert.equal(result[1].amount, 2.5);
});

test('calcule le prix unitaire lorsque seul le total est fourni', () => {
  const csv = 'Date completed,Type,Ticker,Quantity,Total amount,Currency\n2026-07-01,Market Sell,AAPL,2,300,USD';
  const result = new RevolutCsvImporter().import({ csv, portfolioId: 'p-1', accountId: 'a-rv' });
  assert.equal(result[0].unitPrice, 150);
});
