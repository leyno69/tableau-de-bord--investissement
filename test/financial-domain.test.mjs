import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  FinancialDomainError,
  createAccount,
  createCalculatedPosition,
  createInstrument,
  createTemporal,
  createTransaction,
} from '../src/domain/financial/index.mjs';

const validInstrument = {
  id: 'instrument:air-liquide',
  type: 'EQUITY',
  isin: 'FR0000120073',
  ticker: 'AI',
  venue: 'XPAR',
  currency: 'EUR',
  providerMappings: [
    {
      provider: 'provider:example',
      symbol: 'AI.PA',
      externalId: '12345',
      validFrom: { kind: 'DATE', value: '2024-01-01' },
    },
  ],
};

const validTransaction = {
  id: 'transaction:1',
  instrumentId: 'instrument:air-liquide',
  accountId: 'account:pea',
  type: 'BUY',
  temporal: { kind: 'INSTANT', value: '2026-07-30T10:15:30+02:00' },
  execution: { quantity: '10.5000', price: '182.37', currency: 'EUR' },
  fees: [{ amount: '1.25', currency: 'EUR', category: 'BROKERAGE' }],
  taxes: [{ amount: '0.45', currency: 'EUR', category: 'TRANSACTION_TAX' }],
  source: { provider: 'manual', externalId: 'order-42', ingestionBatchId: 'batch-7' },
  context: 'REAL',
};

test('creates a valid immutable Instrument and preserves provider mappings', () => {
  const instrument = createInstrument(validInstrument);
  assert.equal(instrument.id, validInstrument.id);
  assert.equal(instrument.isin, validInstrument.isin);
  assert.equal(instrument.providerMappings[0].symbol, 'AI.PA');
  assert.ok(Object.isFrozen(instrument));
  assert.ok(Object.isFrozen(instrument.providerMappings));
  assert.ok(Object.isFrozen(instrument.providerMappings[0]));
});

test('rejects structurally invalid Instrument data without normalizing it', () => {
  assert.throws(() => createInstrument({ ...validInstrument, currency: 'eur' }), FinancialDomainError);
  assert.throws(() => createInstrument({ ...validInstrument, isin: 'FR000012007X' }), FinancialDomainError);
  assert.throws(() => createInstrument({ ...validInstrument, type: 'equity' }), FinancialDomainError);
});

test('creates the minimal Account without fiscal behavior', () => {
  const account = createAccount({ id: 'account:pea', envelope: 'PEA' });
  assert.deepEqual(account, { id: 'account:pea', envelope: 'PEA' });
  assert.ok(Object.isFrozen(account));
});

test('creates a valid Transaction and preserves exact decimal text, fees and taxes', () => {
  const tx = createTransaction(validTransaction);
  assert.equal(tx.execution.quantity, '10.5000');
  assert.equal(tx.execution.price, '182.37');
  assert.equal(tx.fees[0].amount, '1.25');
  assert.equal(tx.taxes[0].amount, '0.45');
  assert.equal(tx.temporal.value, '2026-07-30T10:15:30+02:00');
  assert.equal(tx.context, 'REAL');
  assert.ok(Object.isFrozen(tx));
  assert.ok(Object.isFrozen(tx.execution));
});

test('preserves the source sign of monetary components without defining the business convention', () => {
  const tx = createTransaction({
    ...validTransaction,
    id: 'transaction:signed-fee',
    fees: [{ amount: '-1.25', currency: 'EUR', category: 'BROKERAGE' }],
  });
  assert.equal(tx.fees[0].amount, '-1.25');
  assert.throws(
    () => createTransaction({ ...validTransaction, fees: [{ amount: '-0', currency: 'EUR' }] }),
    FinancialDomainError,
  );
});

test('requires transaction identity, account, instrument, type, temporal value and context', () => {
  for (const field of ['id', 'instrumentId', 'accountId', 'type', 'temporal', 'context']) {
    const candidate = structuredClone(validTransaction);
    delete candidate[field];
    assert.throws(() => createTransaction(candidate), FinancialDomainError, field);
  }
});

test('keeps REAL and SIMULATION explicit and rejects any other context', () => {
  assert.equal(createTransaction({ ...validTransaction, context: 'REAL' }).context, 'REAL');
  assert.equal(createTransaction({ ...validTransaction, id: 'transaction:2', context: 'SIMULATION' }).context, 'SIMULATION');
  assert.throws(() => createTransaction({ ...validTransaction, context: 'PAPER' }), FinancialDomainError);
});

test('allows a transaction without execution while validating execution strictly when present', () => {
  const noExecution = createTransaction({ ...validTransaction, id: 'transaction:cash-event', type: 'CASH_EVENT', execution: null });
  assert.equal(noExecution.execution, null);

  assert.throws(
    () => createTransaction({ ...validTransaction, execution: { quantity: '0', price: '182.37', currency: 'EUR' } }),
    FinancialDomainError,
  );
  assert.throws(
    () => createTransaction({ ...validTransaction, execution: { quantity: '-1', price: '182.37', currency: 'EUR' } }),
    FinancialDomainError,
  );
  assert.throws(
    () => createTransaction({ ...validTransaction, execution: { quantity: '1', price: '182.37000000000000001', currency: 'eur' } }),
    FinancialDomainError,
  );
  assert.throws(() => createTransaction({ ...validTransaction, fees: [null] }), FinancialDomainError);
});

test('preserves temporal precision without inventing or normalizing invalid components', () => {
  assert.deepEqual(createTemporal({ kind: 'DATE', value: '2026-07-30' }), { kind: 'DATE', value: '2026-07-30' });
  assert.deepEqual(createTemporal({ kind: 'PARTIAL', value: '2026-07' }), { kind: 'PARTIAL', value: '2026-07' });
  assert.deepEqual(createTemporal({ kind: 'PARTIAL', value: '2026' }), { kind: 'PARTIAL', value: '2026' });
  assert.throws(() => createTemporal({ kind: 'INSTANT', value: '2026-07-30T10:15:30' }), FinancialDomainError);
  assert.throws(() => createTemporal({ kind: 'DATE', value: '2026-02-30' }), FinancialDomainError);
  assert.throws(() => createTemporal({ kind: 'INSTANT', value: '2026-02-30T10:15:30+02:00' }), FinancialDomainError);
  assert.throws(() => createTemporal({ kind: 'INSTANT', value: '2026-07-30T25:15:30+02:00' }), FinancialDomainError);
});

test('CalculatedPosition remains a derived projection descriptor only', () => {
  const position = createCalculatedPosition({
    projectionId: 'projection:cmp:1',
    calculationVersion: 'V1',
    instrumentId: 'instrument:air-liquide',
    accountId: 'account:pea',
    context: 'REAL',
  });
  assert.deepEqual(Object.keys(position).sort(), [
    'accountId',
    'calculationVersion',
    'context',
    'instrumentId',
    'projectionId',
  ]);
  assert.throws(
    () => createCalculatedPosition({ ...position, projectionId: 'projection:2', context: 'PAPER' }),
    FinancialDomainError,
  );
});

test('financial domain source has no infrastructure, broker, DOM or storage dependency', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/domain/financial');
  const files = (await readdir(root)).filter((name) => name.endsWith('.mjs'));
  const forbidden = /\b(window|document|localStorage|sessionStorage|fetch)\b|trade\s*republic|revolut|node:(?:fs|http|https|net)/i;

  for (const file of files) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, forbidden, `${file} must remain infrastructure-independent`);
  }
});
