function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
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

function normalizeRecord(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`records[${index}] doit être un objet.`);
  const status = requiredText(input.status, `records[${index}].status`);
  if (!['prepared', 'validated', 'rejected', 'obsolete'].includes(status)) throw new TypeError(`Statut de calibration inconnu : ${status}.`);
  const criterionResults = requiredArray(input.criterionResults, `records[${index}].criterionResults`, 1)
    .map((result, criterionIndex) => ({
      criterionId: requiredText(result.criterionId, `records[${index}].criterionResults[${criterionIndex}].criterionId`),
      status: requiredText(result.status, `records[${index}].criterionResults[${criterionIndex}].status`),
      holdoutStudyId: requiredText(result.holdoutStudyId, `records[${index}].criterionResults[${criterionIndex}].holdoutStudyId`),
      contradictionsReviewed: result.contradictionsReviewed === true
    }))
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));
  return Object.freeze({
    recordId: requiredText(input.recordId, `records[${index}].recordId`),
    protocolId: requiredText(input.protocolId, `records[${index}].protocolId`),
    protocolVersion: requiredText(input.protocolVersion, `records[${index}].protocolVersion`),
    conclusionId: requiredText(input.conclusionId, `records[${index}].conclusionId`),
    engineVersion: requiredText(input.engineVersion, `records[${index}].engineVersion`),
    datasetFingerprint: requiredText(input.datasetFingerprint, `records[${index}].datasetFingerprint`),
    status,
    criterionResults: Object.freeze(criterionResults)
  });
}

export function validateEvidenceCalibrations(recordsInput) {
  const records = requiredArray(recordsInput, 'records', 2).map(normalizeRecord)
    .sort((left, right) => left.recordId.localeCompare(right.recordId));
  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.recordId)) throw new Error(`recordId dupliqué : ${record.recordId}.`);
    ids.add(record.recordId);
  }

  const protocolIds = [...new Set(records.map(record => record.protocolId))];
  const conclusionIds = [...new Set(records.map(record => record.conclusionId))];
  if (protocolIds.length !== 1) throw new Error('Les calibrations doivent partager le même protocole.');
  if (conclusionIds.length !== 1) throw new Error('Les calibrations doivent viser la même conclusion.');

  const criterionIds = [...new Set(records.flatMap(record => record.criterionResults.map(result => result.criterionId)))].sort();
  const evaluations = criterionIds.map(criterionId => {
    const results = records.map(record => ({
      recordId: record.recordId,
      result: record.criterionResults.find(item => item.criterionId === criterionId) ?? null
    }));
    const missingIn = results.filter(item => item.result === null).map(item => item.recordId);
    const statuses = [...new Set(results.filter(item => item.result).map(item => item.result.status))];
    const holdouts = [...new Set(results.filter(item => item.result).map(item => item.result.holdoutStudyId))];
    const contradictionsReviewed = results.every(item => item.result?.contradictionsReviewed === true);
    const blockers = [];
    if (missingIn.length > 0) blockers.push('incomplete-criterion-coverage');
    if (statuses.length > 1) blockers.push('contradictory-criterion-statuses');
    if (!contradictionsReviewed) blockers.push('contradictions-not-reviewed');
    return Object.freeze({
      criterionId,
      statuses: Object.freeze(statuses.sort()),
      holdoutStudyIds: Object.freeze(holdouts.sort()),
      missingIn: Object.freeze(missingIn),
      contradictionsReviewed,
      blockers: Object.freeze(blockers),
      status: blockers.length === 0 ? 'concordant' : 'blocked'
    });
  });

  const blockers = [];
  if (new Set(records.map(record => record.datasetFingerprint)).size < records.length) blockers.push('datasets-not-independent');
  if (records.some(record => record.status !== 'validated')) blockers.push('non-validated-record');
  if (evaluations.some(evaluation => evaluation.status === 'blocked')) blockers.push('criterion-blocked');

  return deepFreeze({
    schemaVersion: 1,
    protocolId: protocolIds[0],
    conclusionId: conclusionIds[0],
    recordIds: Object.freeze(records.map(record => record.recordId)),
    protocolVersions: Object.freeze([...new Set(records.map(record => record.protocolVersion))].sort()),
    engineVersions: Object.freeze([...new Set(records.map(record => record.engineVersion))].sort()),
    evaluations: Object.freeze(evaluations),
    blockers: Object.freeze(blockers),
    isCrossValidated: blockers.length === 0,
    method: 'Validation croisée descriptive des calibrations du niveau de preuve sur des jeux de données indépendants.',
    limitations: Object.freeze([
      'La concordance entre calibrations ne démontre ni causalité ni généralisation universelle.',
      'Aucun niveau de preuve, score, pondération ou IGL n’est calculé.',
      'Les divergences de versions restent visibles et doivent être analysées séparément.'
    ])
  });
}
