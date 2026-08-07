function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function isoDate(value, field) {
  const normalized = text(value, field);
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date ISO valide.`);
  return Object.freeze({ value: normalized, timestamp });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function evaluateEvidenceFreshness(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const observedAt = isoDate(input.observedAt, 'observedAt');
  const evaluatedAt = isoDate(input.evaluatedAt, 'evaluatedAt');
  if (evaluatedAt.timestamp < observedAt.timestamp) throw new Error('evaluatedAt ne peut pas précéder observedAt.');
  if (!Number.isInteger(input.maximumAgeDays) || input.maximumAgeDays < 0) throw new TypeError('maximumAgeDays doit être un entier positif ou nul.');
  const ageDays = Math.floor((evaluatedAt.timestamp - observedAt.timestamp) / 86400000);
  const status = ageDays <= input.maximumAgeDays ? 'current' : 'stale';
  return freeze({
    schemaVersion: 1,
    evidenceId: text(input.evidenceId, 'evidenceId'),
    policyId: text(input.policyId, 'policyId'),
    policyVersion: text(input.policyVersion, 'policyVersion'),
    observedAt: observedAt.value,
    evaluatedAt: evaluatedAt.value,
    maximumAgeDays: input.maximumAgeDays,
    ageDays,
    status,
    blockers: status === 'stale' ? Object.freeze(['evidence-stale']) : Object.freeze([]),
    limitations: Object.freeze((input.limitations ?? []).map((value, index) => text(value, `limitations[${index}]`)))
  });
}
