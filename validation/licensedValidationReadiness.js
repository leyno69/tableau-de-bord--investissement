function assessSeries(input, id) {
  const blockers = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) blockers.push(`${id}:missing`);
  else {
    if (input.validationEligible !== true) blockers.push(`${id}:not-validation-eligible`);
    if (typeof input.licenseReference !== 'string' || input.licenseReference.trim() === '') blockers.push(`${id}:missing-license-reference`);
    if (typeof input.currency !== 'string' || input.currency.toUpperCase() !== 'EUR') blockers.push(`${id}:currency-must-be-EUR`);
    if (!Array.isArray(input.series) || input.series.length < 2) blockers.push(`${id}:insufficient-series`);
  }
  return blockers;
}

export function assessLicensedBeginnerValidationReadiness({ worldProxy, paej } = {}) {
  const blockers = [
    ...assessSeries(worldProxy, 'worldProxy'),
    ...assessSeries(paej, 'paej')
  ];
  return Object.freeze({
    schemaVersion: 1,
    ready: blockers.length === 0,
    blockers: Object.freeze(blockers.sort()),
    requiredTrack: 'licensed-proxy-validation',
    fallbackToDevelopmentSourceAllowed: false
  });
}
