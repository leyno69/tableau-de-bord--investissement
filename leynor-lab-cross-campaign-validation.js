function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
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

function normalizeRecord(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`records[${index}] doit être un objet.`);
  }
  const criterionResults = requiredArray(input.criterionResults, `records[${index}].criterionResults`, 1)
    .map((result, criterionIndex) => {
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new TypeError(`records[${index}].criterionResults[${criterionIndex}] doit être un objet.`);
      }
      const status = requiredText(result.status, `records[${index}].criterionResults[${criterionIndex}].status`);
      if (!['satisfied', 'unsatisfied', 'not-evaluated'].includes(status)) {
        throw new TypeError(`Statut de critère inconnu : ${status}.`);
      }
      return Object.freeze({
        criterionId: requiredText(result.criterionId, `records[${index}].criterionResults[${criterionIndex}].criterionId`),
        status,
        holdoutValidated: result.holdoutValidated === true,
        calibrationReference: requiredText(
          result.calibrationReference,
          `records[${index}].criterionResults[${criterionIndex}].calibrationReference`
        )
      });
    })
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));

  const seenCriteria = new Set();
  for (const result of criterionResults) {
    if (seenCriteria.has(result.criterionId)) throw new Error(`criterionId dupliqué : ${result.criterionId}.`);
    seenCriteria.add(result.criterionId);
  }

  return Object.freeze({
    recordId: requiredText(input.recordId, `records[${index}].recordId`),
    protocolId: requiredText(input.protocolId, `records[${index}].protocolId`),
    protocolVersion: requiredText(input.protocolVersion, `records[${index}].protocolVersion`),
    engineVersion: requiredText(input.engineVersion, `records[${index}].engineVersion`),
    targetConclusion: requiredText(input.targetConclusion, `records[${index}].targetConclusion`),
    datasetFingerprint: requiredText(input.datasetFingerprint, `records[${index}].datasetFingerprint`),
    resultFingerprint: requiredText(input.resultFingerprint, `records[${index}].resultFingerprint`),
    criterionResults
  });
}

export function validateAcrossCalibrationRecords({ validationId, records }) {
  const normalizedRecords = requiredArray(records, 'records', 2)
    .map(normalizeRecord)
    .sort((left, right) => left.recordId.localeCompare(right.recordId));

  const recordIds = new Set();
  const resultFingerprints = new Set();
  for (const record of normalizedRecords) {
    if (recordIds.has(record.recordId)) throw new Error(`recordId dupliqué : ${record.recordId}.`);
    if (resultFingerprints.has(record.resultFingerprint)) {
      throw new Error(`resultFingerprint dupliqué : ${record.resultFingerprint}.`);
    }
    recordIds.add(record.recordId);
    resultFingerprints.add(record.resultFingerprint);
  }

  const protocolIds = new Set(normalizedRecords.map(record => record.protocolId));
  const targets = new Set(normalizedRecords.map(record => record.targetConclusion));
  if (protocolIds.size !== 1) throw new Error('Les calibrations comparées doivent partager le même protocolId.');
  if (targets.size !== 1) throw new Error('Les calibrations comparées doivent viser la même conclusion.');

  const criterionIds = [...new Set(normalizedRecords.flatMap(record =>
    record.criterionResults.map(result => result.criterionId)
  ))].sort();

  const criteria = criterionIds.map(criterionId => {
    const observations = normalizedRecords.map(record => ({
      recordId: record.recordId,
      result: record.criterionResults.find(result => result.criterionId === criterionId) ?? null
    }));
    const evaluated = observations.filter(observation => observation.result != null);
    const missingRecordIds = observations
      .filter(observation => observation.result == null)
      .map(observation => observation.recordId);
    const statuses = new Set(evaluated.map(observation => observation.result.status));
    const references = new Set(evaluated.map(observation => observation.result.calibrationReference));
    const holdoutValidatedCount = evaluated.filter(observation => observation.result.holdoutValidated).length;
    const contradictory = statuses.has('satisfied') && statuses.has('unsatisfied');
    const blockers = [];
    if (missingRecordIds.length > 0) blockers.push('incomplete-criterion-coverage');
    if (contradictory) blockers.push('contradictory-results');
    if (references.size > 1) blockers.push('calibration-reference-mismatch');
    if (holdoutValidatedCount < normalizedRecords.length) blockers.push('incomplete-holdout-validation');

    return Object.freeze({
      criterionId,
      recordCount: normalizedRecords.length,
      evaluatedRecordCount: evaluated.length,
      missingRecordIds: Object.freeze(missingRecordIds),
      statuses: Object.freeze([...statuses].sort()),
      calibrationReferences: Object.freeze([...references].sort()),
      holdoutValidatedCount,
      concordant: blockers.length === 0 && statuses.size === 1 && statuses.has('satisfied'),
      contradictory,
      blockers: Object.freeze(blockers)
    });
  });

  const datasetCount = new Set(normalizedRecords.map(record => record.datasetFingerprint)).size;
  const engineVersions = [...new Set(normalizedRecords.map(record => record.engineVersion))].sort();
  const protocolVersions = [...new Set(normalizedRecords.map(record => record.protocolVersion))].sort();
  const blockers = [];
  if (datasetCount < normalizedRecords.length) blockers.push('datasets-not-independent');
  if (protocolVersions.length > 1) blockers.push('protocol-version-mismatch');
  if (criteria.some(criterion => criterion.blockers.length > 0)) blockers.push('criterion-blocked');

  return deepFreeze({
    schemaVersion: 1,
    validationId: requiredText(validationId, 'validationId'),
    protocolId: normalizedRecords[0].protocolId,
    targetConclusion: normalizedRecords[0].targetConclusion,
    recordCount: normalizedRecords.length,
    independentDatasetCount: datasetCount,
    engineVersions,
    protocolVersions,
    records: normalizedRecords,
    criteria,
    blockers: Object.freeze(blockers),
    isConcordant: blockers.length === 0 && criteria.every(criterion => criterion.concordant),
    limitations: Object.freeze([
      'Cette validation croisée décrit la concordance entre calibrations enregistrées ; elle ne calcule aucun niveau de confiance.',
      'Une concordance entre campagnes ne démontre pas une causalité ni une généralisation à toutes les périodes ou populations.',
      'Les changements de version du moteur sont inventoriés mais doivent être analysés séparément.',
      'Cette validation ne constitue ni un niveau de preuve, ni un IGL, ni une recommandation d’investissement.'
    ])
  });
}
