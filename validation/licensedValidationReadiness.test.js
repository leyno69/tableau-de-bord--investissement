import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLicensedBeginnerValidationReadiness } from './licensedValidationReadiness.js';

const valid = Object.freeze({
  validationEligible: true,
  licenseReference: 'licensed-001',
  currency: 'EUR',
  series: Object.freeze([
    Object.freeze({ date: '2020-01-02', price: 100 }),
    Object.freeze({ date: '2020-01-03', price: 101 })
  ])
});

test('est prêt uniquement lorsque les deux séries licenciées EUR sont présentes', () => {
  const result = assessLicensedBeginnerValidationReadiness({ worldProxy: valid, paej: valid });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.fallbackToDevelopmentSourceAllowed, false);
});

test('énumère les bloqueurs sans fallback silencieux', () => {
  const result = assessLicensedBeginnerValidationReadiness({ worldProxy: { ...valid, currency: 'USD' } });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes('worldProxy:currency-must-be-EUR'));
  assert.ok(result.blockers.includes('paej:missing'));
});
