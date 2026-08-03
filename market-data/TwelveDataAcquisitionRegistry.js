function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function createTwelveDataAcquisitionRecord(report) {
  if (!report || typeof report !== 'object') throw new TypeError('report must be an object');
  const fingerprint = assertString(report.fingerprint, 'report.fingerprint');
  if (!/^sha256:[a-f0-9]{64}$/i.test(fingerprint)) throw new TypeError('report.fingerprint must be sha256');
  const recordCount = Number(report.recordCount);
  if (!Number.isInteger(recordCount) || recordCount < 1 || recordCount > 5) {
    throw new RangeError('report.recordCount must be between 1 and 5');
  }

  return deepFreeze({
    acquisitionId: `twelvedata:${fingerprint.slice(7, 23)}`,
    providerId: 'twelve-data',
    sourceType: 'external-api',
    symbol: assertString(report.symbol, 'report.symbol').toUpperCase(),
    interval: assertString(report.interval, 'report.interval'),
    importedAt: assertString(report.importedAt, 'report.importedAt'),
    requestedRange: deepFreeze({
      startDate: assertString(report.requestedRange?.startDate, 'report.requestedRange.startDate'),
      endDate: assertString(report.requestedRange?.endDate, 'report.requestedRange.endDate'),
    }),
    recordCount,
    fingerprint: fingerprint.toLowerCase(),
    licenceStatus: 'account-terms-require-verification',
    pointInTimeStatus: 'not-guaranteed',
    survivorshipBiasStatus: 'not-audited',
    historicalRevisionStatus: 'not-audited',
    externalValidationStatus: 'not-executed',
    productionAllowed: false,
    notice: 'This record proves a bounded acquisition and fingerprint only. It does not establish point-in-time validity, survivorship-bias control, or external validation.',
  });
}

export function auditTwelveDataAcquisitionRecord(record) {
  if (!record || typeof record !== 'object') throw new TypeError('record must be an object');
  const blockers = [];
  if (record.pointInTimeStatus !== 'verified') blockers.push('point-in-time-not-verified');
  if (record.survivorshipBiasStatus !== 'audited') blockers.push('survivorship-bias-not-audited');
  if (record.historicalRevisionStatus !== 'audited') blockers.push('historical-revisions-not-audited');
  if (record.licenceStatus !== 'verified-for-research') blockers.push('licence-not-verified-for-research');
  return deepFreeze({
    acquisitionId: record.acquisitionId,
    registered: true,
    usableForDevelopment: true,
    usableForExternalValidation: blockers.length === 0,
    usableForProduction: false,
    blockers,
  });
}
