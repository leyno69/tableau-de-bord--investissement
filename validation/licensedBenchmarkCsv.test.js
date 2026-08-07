import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLicensedBenchmarkCsv } from './licensedBenchmarkCsv.js';

const manifest = Object.freeze({
  provider: 'MSCI',
  licenseReference: 'contract-ref-001',
  indexCode: '990100',
  returnVariant: 'NETR',
  currency: 'EUR',
  validationEligible: true
});

test('importe un export licencié minimal et conserve la traçabilité', () => {
  const parsed = parseLicensedBenchmarkCsv('date,level\n2020-01-02,100\n2020-01-03,101.5\n', manifest);
  assert.equal(parsed.provider, 'MSCI');
  assert.equal(parsed.indexCode, '990100');
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.series.length, 2);
  assert.equal(parsed.series[1].price, 101.5);
});

test('refuse un manifeste non déclaré validation-eligible', () => {
  assert.throws(() => parseLicensedBenchmarkCsv('date,level\n2020-01-02,100\n2020-01-03,101\n', { ...manifest, validationEligible: false }), /validationEligible/);
});

test('refuse les dates dupliquées et niveaux invalides', () => {
  assert.throws(() => parseLicensedBenchmarkCsv('date,level\n2020-01-02,100\n2020-01-02,101\n', manifest), /dupliquée/);
  assert.throws(() => parseLicensedBenchmarkCsv('date,level\n2020-01-02,100\n2020-01-03,0\n', manifest), /> 0/);
});
