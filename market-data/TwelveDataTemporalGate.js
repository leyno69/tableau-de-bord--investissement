function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function auditTwelveDataTemporalEligibility({ acquisitionRecord, prices }) {
  if (!acquisitionRecord || typeof acquisitionRecord !== 'object') throw new TypeError('acquisitionRecord must be an object');
  if (!Array.isArray(prices)) throw new TypeError('prices must be an array');

  const violations = [];
  if (acquisitionRecord.providerId !== 'twelve-data') violations.push('unexpected-provider');
  if (acquisitionRecord.pointInTimeStatus !== 'verified') violations.push('point-in-time-not-verified');
  if (acquisitionRecord.historicalRevisionStatus !== 'audited') violations.push('historical-revisions-not-audited');
  if (acquisitionRecord.survivorshipBiasStatus !== 'audited') violations.push('survivorship-bias-not-audited');
  if (acquisitionRecord.licenceStatus !== 'verified-for-research') violations.push('licence-not-verified-for-research');

  for (const [index, row] of prices.entries()) {
    if (!row || typeof row !== 'object') throw new TypeError(`prices[${index}] must be an object`);
    if (typeof row.observedAt !== 'string' || typeof row.availableAt !== 'string') {
      violations.push(`timestamp-metadata-missing:${index}`);
      continue;
    }
    if (Date.parse(row.availableAt) > Date.parse(row.observedAt)) {
      violations.push(`released-after-observation:${index}`);
    }
  }

  const uniqueViolations = [...new Set(violations)];
  const rowLevelTemporalCheckPassed = uniqueViolations.every((code) => !code.startsWith('released-after-observation') && !code.startsWith('timestamp-metadata-missing'));

  return deepFreeze({
    providerId: acquisitionRecord.providerId,
    recordCount: prices.length,
    rowLevelTemporalCheckPassed,
    eligibleForDevelopment: prices.length > 0,
    eligibleForValidation: false,
    eligibleForLockedTest: false,
    eligibleForExternalValidation: false,
    readyForProduction: false,
    blocked: uniqueViolations.length > 0,
    violations: uniqueViolations,
    notice: 'Twelve Data observations remain development-only until point-in-time availability, revisions, survivorship bias and licence are independently verified.',
  });
}
