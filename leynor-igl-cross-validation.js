function assertProbability(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be in [0, 1]`);
  }
}

function sign(value) {
  if (value === 0) return 0;
  return value > 0 ? 1 : -1;
}

export function compareCampaignEffects(reference, validation, options = {}) {
  if (!reference?.campaignId || !validation?.campaignId) {
    throw new TypeError('reference and validation require campaignId');
  }
  if (reference.campaignId === validation.campaignId) {
    throw new RangeError('cross-validation requires independent campaign identifiers');
  }
  for (const [name, value] of [
    ['reference.effect', reference.effect],
    ['validation.effect', validation.effect],
    ['reference.relativeDispersion', reference.relativeDispersion],
    ['validation.relativeDispersion', validation.relativeDispersion],
  ]) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  }

  const maximumRelativeDrift = options.maximumRelativeDrift ?? 0.25;
  const maximumValidationDispersion = options.maximumValidationDispersion ?? 0.05;
  assertProbability(maximumRelativeDrift, 'maximumRelativeDrift');
  assertProbability(maximumValidationDispersion, 'maximumValidationDispersion');

  const denominator = Math.max(Math.abs(reference.effect), Number.EPSILON);
  const relativeDrift = Math.abs(validation.effect - reference.effect) / denominator;
  const directionPreserved = sign(reference.effect) === sign(validation.effect);
  const validationStable = validation.relativeDispersion <= maximumValidationDispersion;
  const passed = directionPreserved && validationStable && relativeDrift <= maximumRelativeDrift;

  return Object.freeze({
    referenceCampaignId: reference.campaignId,
    validationCampaignId: validation.campaignId,
    referenceEffect: reference.effect,
    validationEffect: validation.effect,
    relativeDrift,
    directionPreserved,
    validationStable,
    passed,
    reason: passed
      ? 'direction, dispersion and drift criteria satisfied'
      : !directionPreserved
        ? 'effect direction not reproduced'
        : !validationStable
          ? 'validation campaign remains statistically unstable'
          : 'effect drift exceeds the accepted threshold',
  });
}

export function validateCandidate(candidate, options = {}) {
  if (!candidate?.candidateId || !Array.isArray(candidate.campaigns)) {
    throw new TypeError('candidate requires candidateId and campaigns');
  }
  if (candidate.campaigns.length < 2) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      status: 'insufficient-independent-campaigns',
      comparisons: Object.freeze([]),
      passedComparisonCount: 0,
      comparisonCount: 0,
      notice: 'Candidate remains excluded from IGL calibration.',
    });
  }

  const [reference, ...validations] = candidate.campaigns;
  const comparisons = validations.map((validation) => compareCampaignEffects(reference, validation, options));
  const passedComparisonCount = comparisons.filter((comparison) => comparison.passed).length;
  const status = passedComparisonCount === comparisons.length
    ? 'cross-validated'
    : 'not-reproduced';

  return Object.freeze({
    candidateId: candidate.candidateId,
    status,
    referenceCampaignId: reference.campaignId,
    comparisons: Object.freeze(comparisons),
    passedComparisonCount,
    comparisonCount: comparisons.length,
    notice: status === 'cross-validated'
      ? 'Candidate may enter experimental calibration; no production IGL weight is authorized.'
      : 'Candidate remains excluded from IGL calibration.',
  });
}

export function buildCrossValidationRegister(candidates, options = {}) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  const results = candidates
    .map((candidate) => validateCandidate(candidate, options))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  return Object.freeze({
    generatedAt: null,
    candidateCount: results.length,
    crossValidatedCount: results.filter((result) => result.status === 'cross-validated').length,
    results: Object.freeze(results),
    notice: 'Cross-validation is evidence screening, not an IGL score or recommendation.',
  });
}
