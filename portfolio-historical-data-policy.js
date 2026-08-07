function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function booleanTrue(value, field) {
  if (value !== true) throw new TypeError(`${field} doit être explicitement true.`);
  return true;
}

export function defineHistoricalSeriesContract(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const returnBasis = text(input.returnBasis, 'returnBasis');
  if (!['price', 'total-return-gross', 'total-return-net'].includes(returnBasis)) throw new TypeError('returnBasis invalide.');
  const frequency = text(input.frequency, 'frequency');
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) throw new TypeError('frequency invalide.');
  return Object.freeze({
    schemaVersion: 1,
    seriesId: text(input.seriesId, 'seriesId'),
    provider: text(input.provider, 'provider'),
    providerSeriesId: text(input.providerSeriesId, 'providerSeriesId'),
    licenseId: text(input.licenseId, 'licenseId'),
    currency: text(input.currency, 'currency').toUpperCase(),
    timezone: text(input.timezone, 'timezone'),
    frequency,
    returnBasis,
    pointInTimeVerified: booleanTrue(input.pointInTimeVerified, 'pointInTimeVerified'),
    corporateActionsDocumented: booleanTrue(input.corporateActionsDocumented, 'corporateActionsDocumented'),
    missingDataPolicyId: text(input.missingDataPolicyId, 'missingDataPolicyId'),
    datasetFingerprint: text(input.datasetFingerprint, 'datasetFingerprint'),
  });
}

export function defineHistoricalBenchmarkPolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const benchmarks = input.benchmarks;
  if (!Array.isArray(benchmarks) || benchmarks.length === 0) throw new TypeError('benchmarks doit être un tableau non vide.');
  const ids = benchmarks.map((benchmark, index) => text(benchmark?.seriesId, `benchmarks[${index}].seriesId`));
  if (new Set(ids).size !== ids.length) throw new TypeError('benchmarks contient des doublons.');
  return Object.freeze({
    schemaVersion: 1,
    policyId: text(input.policyId, 'policyId'),
    selectionRule: text(input.selectionRule, 'selectionRule'),
    selectedBeforeOutcomeAccess: booleanTrue(input.selectedBeforeOutcomeAccess, 'selectedBeforeOutcomeAccess'),
    sameCurrencyRequired: booleanTrue(input.sameCurrencyRequired, 'sameCurrencyRequired'),
    sameReturnBasisRequired: booleanTrue(input.sameReturnBasisRequired, 'sameReturnBasisRequired'),
    benchmarks: Object.freeze(ids),
  });
}
