import test from 'node:test';
import assert from 'node:assert/strict';

import { TradeRepublicCsvImporter } from '../../infrastructure/brokers/trade-republic/TradeRepublicCsvImporter.js';

test('importe achats et dividendes Trade Republic', () => {
  const csv = `Date;Type;ISIN;Quantity;Price;Amount;Fees;Taxes;Currency;Transaction ID
2026-07-01;Buy;IE0002XZSHO1;2,5;10,20;25,50;1,00;0;EUR;abc
2026-07-15;Dividend;US0000000001;0;0;4,50;0;0,50;EUR;def`;
  const importer = new TradeRepublicCsvImporter({ clock: () => new Date('2026-07-31T05:00:00.000Z') });
  const result = importer.import({ csv, portfolioId: 'p-1', accountId: 'a-1' });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    id: 'trade-republic:abc', externalId: 'abc', source: 'TRADE_REPUBLIC_CSV', portfolioId: 'p-1', accountId: 'a-1',
    assetId: 'IE0002XZSHO1', type: 'buy', quantity: 2.5, unitPrice: 10.2, amount: undefined,
    fees: 1, taxes: 0, currency: 'EUR', executedAt: '2026-07-01T00:00:00.000Z', createdAt: '2026-07-31T05:00:00.000Z', context: 'REAL',
    metadata: { broker: 'trade-republic', rawType: 'Buy' }
  });
  assert.equal(result[1].type, 'dividend');
  assert.equal(result[1].amount, 4.5);
  assert.equal(result[1].taxes, 0.5);
});

test('génère un identifiant stable lorsque la référence manque', () => {
  const importer = new TradeRepublicCsvImporter();
  const csv = 'Date,Type,ISIN,Quantity,Price,Currency\n2026-07-01,Buy,IE0002XZSHO1,1,10,EUR';
  const first = importer.import({ csv, portfolioId: 'p-1', accountId: 'a-1' })[0];
  const second = importer.import({ csv, portfolioId: 'p-1', accountId: 'a-1' })[0];
  assert.equal(first.id, second.id);
});
