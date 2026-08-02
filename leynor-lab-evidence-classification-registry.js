function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function createEvidenceClassificationRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('record doit être un objet.');
  const level = text(input.level, 'level');
  if (!['unclassified', 'limited', 'moderate', 'strong'].includes(level)) throw new TypeError(`Niveau de preuve inconnu : ${level}.`);
  const blockers = Array.isArray(input.blockers) ? input.blockers.map((v, i) => text(v, `blockers[${i}]`)).sort() : [];
  if (level !== 'unclassified' && blockers.length > 0) throw new Error('Une classification attribuée ne peut conserver de blocage actif.');
  return freeze({
    schemaVersion: 1,
    recordId: text(input.recordId, 'recordId'),
    conclusionId: text(input.conclusionId, 'conclusionId'),
    level,
    ruleId: level === 'unclassified' ? null : text(input.ruleId, 'ruleId'),
    ruleVersion: level === 'unclassified' ? null : text(input.ruleVersion, 'ruleVersion'),
    calibrationReference: level === 'unclassified' ? null : text(input.calibrationReference, 'calibrationReference'),
    crossValidationReference: text(input.crossValidationReference, 'crossValidationReference'),
    classifierVersion: text(input.classifierVersion, 'classifierVersion'),
    resultFingerprint: text(input.resultFingerprint, 'resultFingerprint'),
    recordedAt: text(input.recordedAt, 'recordedAt'),
    blockers: Object.freeze(blockers),
    rationale: text(input.rationale, 'rationale'),
    limitations: Object.freeze((input.limitations ?? []).map((v, i) => text(v, `limitations[${i}]`))),
    supersedesRecordId: input.supersedesRecordId == null ? null : text(input.supersedesRecordId, 'supersedesRecordId')
  });
}

export function createEvidenceClassificationRegistry(records = []) {
  const ordered = records.map(createEvidenceClassificationRecord)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.recordId.localeCompare(b.recordId));
  const ids = new Set();
  const fingerprints = new Set();
  for (const record of ordered) {
    if (ids.has(record.recordId)) throw new Error(`recordId dupliqué : ${record.recordId}.`);
    if (fingerprints.has(record.resultFingerprint)) throw new Error(`resultFingerprint dupliqué : ${record.resultFingerprint}.`);
    ids.add(record.recordId);
    fingerprints.add(record.resultFingerprint);
  }
  return freeze({
    schemaVersion: 1,
    records: ordered,
    add(input) {
      const record = createEvidenceClassificationRecord(input);
      const existing = ordered.find(item => item.recordId === record.recordId);
      if (existing) {
        if (JSON.stringify(existing) === JSON.stringify(record)) return createEvidenceClassificationRegistry(ordered);
        throw new Error(`Conflit de classification pour recordId : ${record.recordId}.`);
      }
      if (ordered.some(item => item.resultFingerprint === record.resultFingerprint)) throw new Error(`resultFingerprint déjà enregistré : ${record.resultFingerprint}.`);
      if (record.supersedesRecordId && !ordered.some(item => item.recordId === record.supersedesRecordId)) throw new Error(`Classification remplacée introuvable : ${record.supersedesRecordId}.`);
      return createEvidenceClassificationRegistry([...ordered, record]);
    },
    latest(conclusionId) {
      const id = text(conclusionId, 'conclusionId');
      return ordered.filter(item => item.conclusionId === id).at(-1) ?? null;
    },
    serialize() { return JSON.stringify({ schemaVersion: 1, records: ordered }); }
  });
}

export function restoreEvidenceClassificationRegistry(serialized) {
  if (typeof serialized !== 'string' || serialized.trim() === '') throw new TypeError('serialized doit être une chaîne JSON non vide.');
  let parsed;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('Registre de classifications JSON invalide.'); }
  if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.records)) throw new Error('Version de registre de classifications incompatible.');
  return createEvidenceClassificationRegistry(parsed.records);
}
