import test from 'node:test';
import assert from 'node:assert/strict';

import { NormalizeBrokerTransactions } from '../../application/import/NormalizeBrokerTransactions.js';

test('normalise des enregistrements multi-courtiers', () => {
  const result = new NormalizeBrokerTransactions().execute({ records: [{
    id: 'trade-republic:1', externalId: '1', source: 'TRADE_REPUBLIC_CSV', portfolioId: 'p-1', accountId: 'a-1',
    assetId: ' ie0002xzsho1 ', type: 'BUY', quantity: '1.5', unitPrice: '10.20', fees: '1', taxes: 0,
    currency: 'eur', executedAt: '2026-07-01', createdAt: '2026-07-31T05:00:00.000Z'
  }] });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].transaction.assetId, 'IE0002XZSHO1');
  assert.equal(result.accepted[0].transaction.quantity, 1.5);
  assert.equal(result.accepted[0].transaction.currency, 'EUR');
});

test('déduplique par source et identifiant externe', () => {
  const records = [0, 1].map(index => ({
    id: `row-${index}`, externalId: 'same', source: 'REVOLUT_CSV', portfolioId: 'p-1', accountId: 'a-1', assetId: 'AAPL',
    type: 'buy', quantity: 1, unitPrice: 100, currency: 'USD', executedAt: '2026-07-01', createdAt: '2026-07-31T05:00:00.000Z'
  }));
  const result = new NormalizeBrokerTransactions().execute({ records });
  assert.equal(result.importedCount, 1);
  assert.equal(result.duplicateCount, 1);
});

test('isole les lignes invalides sans annuler le lot', () => {
  const result = new NormalizeBrokerTransactions().execute({ records: [
    { id: 'ok', portfolioId: 'p-1', accountId: 'a-1', assetId: 'AAPL', type: 'buy', quantity: 1, unitPrice: 100, currency: 'USD', executedAt: '2026-07-01', createdAt: '2026-07-31T05:00:00.000Z' },
    { id: '', type: 'unknown' }
  ] });
  assert.equal(result.importedCount, 1);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.complete, false);
});
