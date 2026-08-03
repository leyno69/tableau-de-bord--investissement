import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditTwelveDataAcquisitionRecord,
  createTwelveDataAcquisitionRecord,
} from './TwelveDataAcquisitionRegistry.js';

const report = {
  fingerprint: `sha256:${'a'.repeat(64)}`,
  symbol: 'aapl',
  interval: '1day',
  importedAt: '2026-08-03T04:30:00.000Z',
  requestedRange: { startDate: '2026-07-20', endDate: '2026-08-03' },
  recordCount: 5,
};

test('registre une acquisition sans déclarer de validation', () => {
  const record = createTwelveDataAcquisitionRecord(report);
  assert.equal(record.symbol, 'AAPL');
  assert.equal(record.pointInTimeStatus, 'not-guaranteed');
  assert.equal(record.externalValidationStatus, 'not-executed');
  assert.equal(record.productionAllowed, false);
  assert.equal(Object.isFrozen(record), true);
});

test('refuse une acquisition non bornée', () => {
  assert.throws(() => createTwelveDataAcquisitionRecord({ ...report, recordCount: 6 }), /between 1 and 5/);
});

test('produit un audit conservateur', () => {
  const audit = auditTwelveDataAcquisitionRecord(createTwelveDataAcquisitionRecord(report));
  assert.equal(audit.usableForDevelopment, true);
  assert.equal(audit.usableForExternalValidation, false);
  assert.equal(audit.usableForProduction, false);
  assert.ok(audit.blockers.includes('point-in-time-not-verified'));
  assert.ok(audit.blockers.includes('licence-not-verified-for-research'));
});
