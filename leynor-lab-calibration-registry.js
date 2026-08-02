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

function requiredBoolean(value, field) {
  if (typeof value !== 'boolean') throw new TypeError(`${field} doit être un booléen.`);
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} dupliqué : ${value}.`);
    seen.add(value);
  }
}

function normalizeCriterionResult(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`criterionResults[${index}] doit être un objet.`);
  }
  const status = requiredText(input.status, `criterionResults[${index}].status`);
  if (!['satisfied', 'unsatisfied', 'not-evaluated'].includes(status)) {
    throw new TypeError(`Statut de critère inconnu : ${status}.`);
  }
  return Object.freeze({
    criterionId: requiredText(input.criterionId, `criterionResults[${index}].criterionId`),
    status,
    observation: requiredText(input.observation, `criterionResults[${index}].observation`),
    calibrationReference: requiredText(
      input.calibrationReference,
      `criterionResults[${index}].calibrationReference`
    ),
    holdoutValidated: requiredBoolean(
      input.holdoutValidated,
      `criterionResults[${index}].holdoutValidated`
    )
  });
}

export function createCalibrationRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('record doit être un objet.');
  }

  const status = requiredText(input.status, 'status');
  if (!['prepared', 'validated', 'rejected', 'obsolete'].includes(status)) {
    throw new TypeError(`Statut de calibration inconnu : ${status}.`);
  }

  const calibrationCampaignIds = requiredArray(
    input.calibrationCampaignIds,
    'calibrationCampaignIds',
    2
  ).map((value, index) => requiredText(value, `calibrationCampaignIds[${index}]`)).sort();
  const holdoutCampaignIds = requiredArray(
    input.holdoutCampaignIds,
    'holdoutCampaignIds',
    1
  ).map((value, index) => requiredText(value, `holdoutCampaignIds[${index}]`)).sort();
  const criterionResults = requiredArray(input.criterionResults, 'criterionResults', 1)
    .map(normalizeCriterionResult)
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));

  assertUnique(calibrationCampaignIds, 'calibrationCampaignId');
  assertUnique(holdoutCampaignIds, 'holdoutCampaignId');
  assertUnique(criterionResults.map(result => result.criterionId), 'criterionId');

  const overlap = calibrationCampaignIds.find(id => holdoutCampaignIds.includes(id));
  if (overlap) throw new Error(`Une campagne ne peut pas être calibration et holdout : ${overlap}.`);

  if (status === 'validated') {
    const invalidResult = criterionResults.find(result =>
      result.status !== 'satisfied' || result.holdoutValidated !== true
    );
    if (invalidResult) {
      throw new Error(`Une calibration validée exige des critères satisfaits et validés hors échantillon : ${invalidResult.criterionId}.`);
    }
  }

  return deepFreeze({
    schemaVersion: 1,
    recordId: requiredText(input.recordId, 'recordId'),
    protocolId: requiredText(input.protocolId, 'protocolId'),
    protocolVersion: requiredText(input.protocolVersion, 'protocolVersion'),
    engineVersion: requiredText(input.engineVersion, 'engineVersion'),
    targetConclusion: requiredText(input.targetConclusion, 'targetConclusion'),
    status,
    recordedAt: requiredText(input.recordedAt, 'recordedAt'),
    datasetFingerprint: requiredText(input.datasetFingerprint, 'datasetFingerprint'),
    resultFingerprint: requiredText(input.resultFingerprint, 'resultFingerprint'),
    calibrationCampaignIds: Object.freeze(calibrationCampaignIds),
    holdoutCampaignIds: Object.freeze(holdoutCampaignIds),
    criterionResults: Object.freeze(criterionResults),
    decisionRationale: requiredText(input.decisionRationale, 'decisionRationale'),
    limitations: Object.freeze(
      requiredArray(input.limitations, 'limitations', 1)
        .map((value, index) => requiredText(value, `limitations[${index}]`))
    ),
    supersedesRecordId: input.supersedesRecordId == null
      ? null
      : requiredText(input.supersedesRecordId, 'supersedesRecordId')
  });
}

export function createCalibrationRegistry(records = []) {
  const normalizedRecords = records.map(createCalibrationRecord);
  assertUnique(normalizedRecords.map(record => record.recordId), 'recordId');
  assertUnique(normalizedRecords.map(record => record.resultFingerprint), 'resultFingerprint');

  const ordered = [...normalizedRecords].sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt) || left.recordId.localeCompare(right.recordId)
  );

  return deepFreeze({
    schemaVersion: 1,
    records: ordered,
    add(recordInput) {
      const record = createCalibrationRecord(recordInput);
      const byId = ordered.find(existing => existing.recordId === record.recordId);
      if (byId) {
        if (JSON.stringify(byId) === JSON.stringify(record)) return createCalibrationRegistry(ordered);
        throw new Error(`Conflit de calibration pour recordId : ${record.recordId}.`);
      }
      const byFingerprint = ordered.find(existing => existing.resultFingerprint === record.resultFingerprint);
      if (byFingerprint) {
        throw new Error(`resultFingerprint déjà enregistré par ${byFingerprint.recordId}.`);
      }
      if (record.supersedesRecordId && !ordered.some(existing => existing.recordId === record.supersedesRecordId)) {
        throw new Error(`Calibration remplacée introuvable : ${record.supersedesRecordId}.`);
      }
      return createCalibrationRegistry([...ordered, record]);
    },
    findByProtocol(protocolId) {
      const normalizedProtocolId = requiredText(protocolId, 'protocolId');
      return Object.freeze(ordered.filter(record => record.protocolId === normalizedProtocolId));
    },
    latestValidated(protocolId) {
      const validated = ordered.filter(record =>
        record.protocolId === requiredText(protocolId, 'protocolId') && record.status === 'validated'
      );
      return validated.at(-1) ?? null;
    },
    serialize() {
      return JSON.stringify({ schemaVersion: 1, records: ordered });
    }
  });
}

export function restoreCalibrationRegistry(serialized) {
  if (typeof serialized !== 'string' || serialized.trim() === '') {
    throw new TypeError('serialized doit être une chaîne JSON non vide.');
  }
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Registre de calibration JSON invalide.');
  }
  if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.records)) {
    throw new Error('Version de registre de calibration incompatible.');
  }
  return createCalibrationRegistry(parsed.records);
}
