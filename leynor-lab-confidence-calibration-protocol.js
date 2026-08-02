function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function integerAtLeast(value, minimum, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    throw new TypeError(`${field} doit être un entier supérieur ou égal à ${minimum}.`);
  }
  return number;
}

function requiredBoolean(value, field) {
  if (typeof value !== 'boolean') throw new TypeError(`${field} doit être un booléen.`);
  return value;
}

function requiredArray(value, field, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new TypeError(`${field} doit contenir au moins ${minimum} élément(s).`);
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizeCampaign(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`campaigns[${index}] doit être un objet.`);
  }
  return Object.freeze({
    campaignId: requiredText(input.campaignId, `campaigns[${index}].campaignId`),
    datasetFingerprint: requiredText(input.datasetFingerprint, `campaigns[${index}].datasetFingerprint`),
    engineVersion: requiredText(input.engineVersion, `campaigns[${index}].engineVersion`),
    role: requiredText(input.role, `campaigns[${index}].role`),
    seedCount: integerAtLeast(input.seedCount, 1, `campaigns[${index}].seedCount`),
    observationCount: integerAtLeast(input.observationCount, 1, `campaigns[${index}].observationCount`),
    reproducible: requiredBoolean(input.reproducible, `campaigns[${index}].reproducible`),
    methodologyEligible: requiredBoolean(input.methodologyEligible, `campaigns[${index}].methodologyEligible`)
  });
}

function normalizeCriterion(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`criteria[${index}] doit être un objet.`);
  }
  return Object.freeze({
    criterionId: requiredText(input.criterionId, `criteria[${index}].criterionId`),
    measuredProperty: requiredText(input.measuredProperty, `criteria[${index}].measuredProperty`),
    calibrationMethod: requiredText(input.calibrationMethod, `criteria[${index}].calibrationMethod`),
    acceptanceRule: requiredText(input.acceptanceRule, `criteria[${index}].acceptanceRule`),
    minimumIndependentCampaigns: integerAtLeast(
      input.minimumIndependentCampaigns,
      2,
      `criteria[${index}].minimumIndependentCampaigns`
    ),
    minimumSeedsPerCampaign: integerAtLeast(input.minimumSeedsPerCampaign, 2, `criteria[${index}].minimumSeedsPerCampaign`),
    minimumObservationsPerCampaign: integerAtLeast(
      input.minimumObservationsPerCampaign,
      1,
      `criteria[${index}].minimumObservationsPerCampaign`
    ),
    holdoutRequired: requiredBoolean(input.holdoutRequired, `criteria[${index}].holdoutRequired`),
    calibrationReference: requiredText(input.calibrationReference, `criteria[${index}].calibrationReference`)
  });
}

function assertUnique(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item[key];
    if (seen.has(value)) throw new Error(`${label} dupliqué : ${value}.`);
    seen.add(value);
  }
}

export function buildConfidenceCalibrationProtocol({
  protocolId,
  protocolVersion,
  targetConclusion,
  campaigns,
  criteria
}) {
  const normalizedCampaigns = requiredArray(campaigns, 'campaigns', 2)
    .map(normalizeCampaign)
    .sort((left, right) => left.campaignId.localeCompare(right.campaignId));
  const normalizedCriteria = requiredArray(criteria, 'criteria', 1)
    .map(normalizeCriterion)
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));

  assertUnique(normalizedCampaigns, 'campaignId', 'campaignId');
  assertUnique(normalizedCriteria, 'criterionId', 'criterionId');

  const datasetFingerprints = new Set(normalizedCampaigns.map(campaign => campaign.datasetFingerprint));
  const calibrationCampaigns = normalizedCampaigns.filter(campaign => campaign.role === 'calibration');
  const holdoutCampaigns = normalizedCampaigns.filter(campaign => campaign.role === 'holdout');
  const unknownRoles = normalizedCampaigns.filter(campaign => !['calibration', 'holdout'].includes(campaign.role));

  if (unknownRoles.length > 0) {
    throw new TypeError(`Rôle de campagne inconnu : ${unknownRoles[0].role}.`);
  }

  const evaluations = normalizedCriteria.map(criterion => {
    const eligibleCampaigns = calibrationCampaigns.filter(campaign =>
      campaign.reproducible
      && campaign.methodologyEligible
      && campaign.seedCount >= criterion.minimumSeedsPerCampaign
      && campaign.observationCount >= criterion.minimumObservationsPerCampaign
    );
    const independentEligibleCount = new Set(eligibleCampaigns.map(campaign => campaign.datasetFingerprint)).size;
    const holdoutAvailable = holdoutCampaigns.some(campaign =>
      campaign.reproducible
      && campaign.methodologyEligible
      && campaign.seedCount >= criterion.minimumSeedsPerCampaign
      && campaign.observationCount >= criterion.minimumObservationsPerCampaign
    );

    const blockers = [];
    if (independentEligibleCount < criterion.minimumIndependentCampaigns) blockers.push('insufficient-independent-campaigns');
    if (criterion.holdoutRequired && !holdoutAvailable) blockers.push('missing-eligible-holdout');

    return Object.freeze({
      criterionId: criterion.criterionId,
      measuredProperty: criterion.measuredProperty,
      calibrationMethod: criterion.calibrationMethod,
      acceptanceRule: criterion.acceptanceRule,
      calibrationReference: criterion.calibrationReference,
      eligibleCalibrationCampaignCount: eligibleCampaigns.length,
      independentEligibleCampaignCount: independentEligibleCount,
      holdoutAvailable,
      status: blockers.length === 0 ? 'ready-for-calibration' : 'blocked',
      blockers: Object.freeze(blockers)
    });
  });

  const globalBlockers = [];
  if (datasetFingerprints.size < 2) globalBlockers.push('campaigns-not-independent');
  if (calibrationCampaigns.length < 2) globalBlockers.push('insufficient-calibration-campaigns');
  if (evaluations.some(evaluation => evaluation.status === 'blocked')) globalBlockers.push('criterion-blocked');

  return deepFreeze({
    schemaVersion: 1,
    protocolId: requiredText(protocolId, 'protocolId'),
    protocolVersion: requiredText(protocolVersion, 'protocolVersion'),
    targetConclusion: requiredText(targetConclusion, 'targetConclusion'),
    method: 'Protocole empirique de calibration sur campagnes indépendantes avec validation séparée.',
    campaignCount: normalizedCampaigns.length,
    independentDatasetCount: datasetFingerprints.size,
    calibrationCampaignCount: calibrationCampaigns.length,
    holdoutCampaignCount: holdoutCampaigns.length,
    campaigns: normalizedCampaigns,
    criteria: normalizedCriteria,
    evaluations: Object.freeze(evaluations),
    blockers: Object.freeze(globalBlockers),
    isReadyForCalibration: globalBlockers.length === 0,
    limitations: Object.freeze([
      'Ce protocole vérifie la préparation d’une calibration ; il ne calcule aucun niveau de confiance.',
      'Les règles d’acceptation doivent être justifiées par des campagnes indépendantes et une référence de calibration vérifiable.',
      'La présence d’un jeu de validation séparé ne garantit pas à elle seule la généralisation des conclusions.',
      'Ce protocole ne constitue ni un niveau de preuve, ni un IGL, ni une recommandation d’investissement.'
    ])
  });
}
