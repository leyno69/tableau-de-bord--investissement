import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTwelveDataTemporalEligibility } from './TwelveDataTemporalGate.js';

const acquisitionRecord = {
  providerId: 'twelve-data',
  pointInTimeStatus: 'not-guaranteed',
  historicalRevisionStatus: 'not-audited',
  survivorshipBiasStatus: 'not-audited',
  licenceStatus: 'account-terms-require-verification',
};

const prices = [{ observedAt: '2026-08-01T00:00:00Z', availableAt: '2026-08-01T00:00:00Z' }];

test('autorise le développement mais bloque validation et test final', () => {
  const audit = auditTwelveDataTemporalEligibility({ acquisitionRecord, prices });
  assert.equal(audit.rowLevelTemporalCheckPassed, true);
  assert.equal(audit.eligibleForDevelopment, true);
  assert.equal(audit.eligibleForValidation, false);
  assert.equal(audit.eligibleForLockedTest, false);
  assert.equal(audit.eligibleForExternalValidation, false);
  assert.equal(audit.readyForProduction, false);
  assert.equal(audit.blocked, true);
  assert.ok(audit.violations.includes('point-in-time-not-verified'));
});

test('détecte une disponibilité postérieure à l’observation', () => {
  const audit = auditTwelveDataTemporalEligibility({
    acquisitionRecord,
    prices: [{ observedAt: '2026-08-01T00:00:00Z', availableAt: '2026-08-02T00:00:00Z' }],
  });
  assert.equal(audit.rowLevelTemporalCheckPassed, false);
  assert.ok(audit.violations.includes('released-after-observation:0'));
});

test('refuse les lignes sans métadonnées temporelles', () => {
  const audit = auditTwelveDataTemporalEligibility({ acquisitionRecord, prices: [{}] });
  assert.equal(audit.rowLevelTemporalCheckPassed, false);
  assert.ok(audit.violations.includes('timestamp-metadata-missing:0'));
});
