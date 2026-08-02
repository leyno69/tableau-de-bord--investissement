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

function normalizeCriterionResult(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`criterionResults[${index}] doit être un objet.`);
  const status = requiredText(input.status, `criterionResults[${index}].status`);
  if (!['satisfied', 'unsatisfied', 'not-evaluated'].includes(status)) throw new TypeError(`Statut de critère inconnu : ${status}.`);
  return Object.freeze({
    criterionId: requiredText(input.criterionId, `criterionResults[${index}].criterionId`),
    status,
    observation: requiredText(input.observation, `criterionResults[${index}].observation`),
    calibrationReference: requiredText(input.calibrationReference, `criterionResults[${index}].calibrationReference`),
    independentStudyIds: Object.freeze(requiredArray(input.independentStudyIds, `criterionResults[${index}].independentStudyIds`, 2)
      .map((value, studyIndex) => requiredText(value, `criterionResults[${index}].independentStudyIds[${studyIndex}]`)).sort()),
    holdoutStudyId: requiredText(input.holdoutStudyId, `criterionResults[${index}].holdoutStudyId`),
    contradictionsReviewed: input.contradictionsReviewed === true
  });
}

export function createEvidenceCalibrationRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('record doit être un objet.');
  const status = requiredText(input.status, 'status');
  if (!['prepared', 'validated', 'rejected', 'obsolete'].includes(status)) throw new TypeError(`Statut de calibration inconnu : ${status}.`);

  const criterionResults = requiredArray(input.criterionResults, 'criterionResults', 1)
    .map(normalizeCriterionResult)
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));
  const seen = new Set();
  for (const result of criterionResults) {
    if (seen.has(result.criterionId)) throw new Error(`criterionId dupliqué : ${result.criterionId}.`);
    seen.add(result.criterionId);
  }

  if (status === 'validated') {
    const invalid = criterionResults.find(result => result.status !== 'satisfied' || result.contradictionsReviewed !== true);
    if (invalid) throw new Error(`Une calibration validée exige des critères satisfaits et des contradictions revues : ${invalid.criterionId}.`);
  }

  return deepFreeze({
    schemaVersion: 1,
    recordId: requiredText(input.recordId, 'recordId'),
    protocolId: requiredText(input.protocolId, 'protocolId'),
    protocolVersion: requiredText(input.protocolVersion, 'protocolVersion'),
    conclusionId: requiredText(input.conclusionId, 'conclusionId'),
    engineVersion: requiredText(input.engineVersion, 'engineVersion'),
    status,
    recordedAt: requiredText(input.recordedAt, 'recordedAt'),
    datasetFingerprint: requiredText(input.datasetFingerprint, 'datasetFingerprint'),
    resultFingerprint: requiredText(input.resultFingerprint, 'resultFingerprint'),
    criterionResults: Object.freeze(criterionResults),
    decisionRationale: requiredText(input.decisionRationale, 'decisionRationale'),
    limitations: Object.freeze(requiredArray(input.limitations, 'limitations', 1)
      .map((value, index) => requiredText(value, `limitations[${index}]`))),
    supersedesRecordId: input.supersedesRecordId == null ? null : requiredText(input.supersedesRecordId, 'supersedesRecordId')
  });
}

export function createEvidenceCalibrationRegistry(records = []) {
  const normalized = records.map(createEvidenceCalibrationRecord);
  const ids = new Set();
  const fingerprints = new Set();
  for (const record of normalized) {
    if (ids.has(record.recordId)) throw new Error(`recordId dupliqué : ${record.recordId}.`);
    if (fingerprints.has(record.resultFingerprint)) throw new Error(`resultFingerprint dupliqué : ${record.resultFingerprint}.`);
    ids.add(record.recordId);
    fingerprints.add(record.resultFingerprint);
  }
  const ordered = [...normalized].sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.recordId.localeCompare(right.recordId));

  return deepFreeze({
    schemaVersion: 1,
    records: ordered,
    add(recordInput) {
      const record = createEvidenceCalibrationRecord(recordInput);
      const sameId = ordered.find(existing => existing.recordId === record.recordId);
      if (sameId) {
        if (JSON.stringify(sameId) === JSON.stringify(record)) return createEvidenceCalibrationRegistry(ordered);
        throw new Error(`Conflit de calibration pour recordId : ${record.recordId}.`);
      }
      const sameFingerprint = ordered.find(existing => existing.resultFingerprint === record.resultFingerprint);
      if (sameFingerprint) throw new Error(`resultFingerprint déjà enregistré par ${sameFingerprint.recordId}.`);
      if (record.supersedesRecordId && !ordered.some(existing => existing.recordId === record.supersedesRecordId)) {
        throw new Error(`Calibration remplacée introuvable : ${record.supersedesRecordId}.`);
      }
      return createEvidenceCalibrationRegistry([...ordered, record]);
    },
    latestValidated(conclusionId) {
      const id = requiredText(conclusionId, 'conclusionId');
      return ordered.filter(record => record.conclusionId === id && record.status === 'validated').at(-1) ?? null;
    },
    serialize() {
      return JSON.stringify({ schemaVersion: 1, records: ordered });
    }
  });
}

export function restoreEvidenceCalibrationRegistry(serialized) {
  if (typeof serialized !== 'string' || serialized.trim() === '') throw new TypeError('serialized doit être une chaîne JSON non vide.');
  let parsed;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('Registre de calibration de preuve JSON invalide.'); }
  if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.records)) throw new Error('Version de registre de calibration de preuve incompatible.');
  return createEvidenceCalibrationRegistry(parsed.records);
}
