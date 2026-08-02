function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function requiredInteger(value, minimum, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) throw new TypeError(`${field} doit être un entier supérieur ou égal à ${minimum}.`);
  return number;
}

function requiredBoolean(value, field) {
  if (typeof value !== 'boolean') throw new TypeError(`${field} doit être un booléen.`);
  return value;
}

function requiredArray(value, field, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) throw new TypeError(`${field} doit contenir au moins ${minimum} élément(s).`);
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizeStudy(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`studies[${index}] doit être un objet.`);
  const role = requiredText(input.role, `studies[${index}].role`);
  if (!['calibration', 'holdout'].includes(role)) throw new TypeError(`Rôle d’étude inconnu : ${role}.`);
  return Object.freeze({
    studyId: requiredText(input.studyId, `studies[${index}].studyId`),
    datasetFingerprint: requiredText(input.datasetFingerprint, `studies[${index}].datasetFingerprint`),
    role,
    independentSourceCount: requiredInteger(input.independentSourceCount, 1, `studies[${index}].independentSourceCount`),
    reproducedConclusionCount: requiredInteger(input.reproducedConclusionCount, 0, `studies[${index}].reproducedConclusionCount`),
    contradictionCount: requiredInteger(input.contradictionCount, 0, `studies[${index}].contradictionCount`),
    methodologyEligible: requiredBoolean(input.methodologyEligible, `studies[${index}].methodologyEligible`),
    reproducible: requiredBoolean(input.reproducible, `studies[${index}].reproducible`)
  });
}

function normalizeCriterion(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`criteria[${index}] doit être un objet.`);
  return Object.freeze({
    criterionId: requiredText(input.criterionId, `criteria[${index}].criterionId`),
    measuredProperty: requiredText(input.measuredProperty, `criteria[${index}].measuredProperty`),
    calibrationMethod: requiredText(input.calibrationMethod, `criteria[${index}].calibrationMethod`),
    acceptanceRule: requiredText(input.acceptanceRule, `criteria[${index}].acceptanceRule`),
    calibrationReference: requiredText(input.calibrationReference, `criteria[${index}].calibrationReference`),
    minimumIndependentStudies: requiredInteger(input.minimumIndependentStudies, 2, `criteria[${index}].minimumIndependentStudies`),
    minimumIndependentSourcesPerStudy: requiredInteger(input.minimumIndependentSourcesPerStudy, 1, `criteria[${index}].minimumIndependentSourcesPerStudy`),
    minimumReproducedConclusionsPerStudy: requiredInteger(input.minimumReproducedConclusionsPerStudy, 1, `criteria[${index}].minimumReproducedConclusionsPerStudy`),
    holdoutRequired: requiredBoolean(input.holdoutRequired, `criteria[${index}].holdoutRequired`),
    contradictionsMustBeReviewed: requiredBoolean(input.contradictionsMustBeReviewed, `criteria[${index}].contradictionsMustBeReviewed`)
  });
}

function assertUnique(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[key])) throw new Error(`${label} dupliqué : ${item[key]}.`);
    seen.add(item[key]);
  }
}

export function buildEvidenceCalibrationProtocol({ protocolId, protocolVersion, conclusionId, studies, criteria }) {
  const normalizedStudies = requiredArray(studies, 'studies', 2).map(normalizeStudy)
    .sort((left, right) => left.studyId.localeCompare(right.studyId));
  const normalizedCriteria = requiredArray(criteria, 'criteria', 1).map(normalizeCriterion)
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));

  assertUnique(normalizedStudies, 'studyId', 'studyId');
  assertUnique(normalizedCriteria, 'criterionId', 'criterionId');

  const calibrationStudies = normalizedStudies.filter(study => study.role === 'calibration');
  const holdoutStudies = normalizedStudies.filter(study => study.role === 'holdout');

  const evaluations = normalizedCriteria.map(criterion => {
    const eligible = calibrationStudies.filter(study =>
      study.methodologyEligible
      && study.reproducible
      && study.independentSourceCount >= criterion.minimumIndependentSourcesPerStudy
      && study.reproducedConclusionCount >= criterion.minimumReproducedConclusionsPerStudy
      && (!criterion.contradictionsMustBeReviewed || study.contradictionCount >= 0)
    );
    const independentStudyCount = new Set(eligible.map(study => study.datasetFingerprint)).size;
    const holdoutAvailable = holdoutStudies.some(study =>
      study.methodologyEligible
      && study.reproducible
      && study.independentSourceCount >= criterion.minimumIndependentSourcesPerStudy
      && study.reproducedConclusionCount >= criterion.minimumReproducedConclusionsPerStudy
    );
    const contradictionsReviewed = !criterion.contradictionsMustBeReviewed
      || normalizedStudies.every(study => Number.isInteger(study.contradictionCount));

    const blockers = [];
    if (independentStudyCount < criterion.minimumIndependentStudies) blockers.push('insufficient-independent-studies');
    if (criterion.holdoutRequired && !holdoutAvailable) blockers.push('missing-eligible-holdout');
    if (!contradictionsReviewed) blockers.push('contradictions-not-reviewed');

    return Object.freeze({
      criterionId: criterion.criterionId,
      measuredProperty: criterion.measuredProperty,
      calibrationMethod: criterion.calibrationMethod,
      acceptanceRule: criterion.acceptanceRule,
      calibrationReference: criterion.calibrationReference,
      independentEligibleStudyCount: independentStudyCount,
      holdoutAvailable,
      contradictionsReviewed,
      status: blockers.length === 0 ? 'ready-for-calibration' : 'blocked',
      blockers: Object.freeze(blockers)
    });
  });

  const blockers = [];
  if (new Set(normalizedStudies.map(study => study.datasetFingerprint)).size < 2) blockers.push('studies-not-independent');
  if (calibrationStudies.length < 2) blockers.push('insufficient-calibration-studies');
  if (evaluations.some(evaluation => evaluation.status === 'blocked')) blockers.push('criterion-blocked');

  return deepFreeze({
    schemaVersion: 1,
    protocolId: requiredText(protocolId, 'protocolId'),
    protocolVersion: requiredText(protocolVersion, 'protocolVersion'),
    conclusionId: requiredText(conclusionId, 'conclusionId'),
    studies: normalizedStudies,
    criteria: normalizedCriteria,
    evaluations: Object.freeze(evaluations),
    blockers: Object.freeze(blockers),
    isReadyForCalibration: blockers.length === 0,
    method: 'Protocole empirique préalable à toute calibration du niveau de preuve, fondé sur des études indépendantes et un holdout séparé.',
    limitations: Object.freeze([
      'Ce protocole vérifie la préparation d’une calibration ; il ne calcule aucun niveau de preuve.',
      'Le nombre de sources ou de reproductions ne mesure pas automatiquement leur qualité.',
      'Les contradictions doivent rester visibles et ne sont jamais compensées par une pondération opaque.',
      'Ce protocole ne constitue ni un niveau de confiance, ni un IGL, ni une recommandation d’investissement.'
    ])
  });
}
