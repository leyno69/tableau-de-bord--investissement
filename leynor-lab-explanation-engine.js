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

function normalizeReference(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`references[${index}] doit être un objet.`);
  }
  const type = requiredText(input.type, `references[${index}].type`);
  if (!['campaign', 'criterion', 'evidence', 'contradiction', 'limitation'].includes(type)) {
    throw new TypeError(`Type de référence inconnu : ${type}.`);
  }
  return Object.freeze({
    type,
    id: requiredText(input.id, `references[${index}].id`),
    label: requiredText(input.label, `references[${index}].label`),
    summary: requiredText(input.summary, `references[${index}].summary`)
  });
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} dupliqué : ${value}.`);
    seen.add(value);
  }
}

export function buildTraceableExplanation({
  explanationId,
  conclusionId,
  question,
  conclusion,
  scope,
  references,
  decisionsNotSupported,
  generatedAt,
  engineVersion
}) {
  const normalizedReferences = requiredArray(references, 'references', 1)
    .map(normalizeReference)
    .sort((left, right) => left.type.localeCompare(right.type) || left.id.localeCompare(right.id));

  assertUnique(
    normalizedReferences.map(reference => `${reference.type}:${reference.id}`),
    'référence'
  );

  const grouped = {
    campaigns: normalizedReferences.filter(reference => reference.type === 'campaign'),
    criteria: normalizedReferences.filter(reference => reference.type === 'criterion'),
    evidence: normalizedReferences.filter(reference => reference.type === 'evidence'),
    contradictions: normalizedReferences.filter(reference => reference.type === 'contradiction'),
    limitations: normalizedReferences.filter(reference => reference.type === 'limitation')
  };

  const blockers = [];
  if (grouped.campaigns.length === 0) blockers.push('missing-campaign-reference');
  if (grouped.criteria.length === 0) blockers.push('missing-criterion-reference');
  if (grouped.evidence.length === 0) blockers.push('missing-evidence-reference');
  if (grouped.limitations.length === 0) blockers.push('missing-limitation-reference');

  const unsupported = requiredArray(decisionsNotSupported, 'decisionsNotSupported', 1)
    .map((value, index) => requiredText(value, `decisionsNotSupported[${index}]`));

  return deepFreeze({
    schemaVersion: 1,
    explanationId: requiredText(explanationId, 'explanationId'),
    conclusionId: requiredText(conclusionId, 'conclusionId'),
    question: requiredText(question, 'question'),
    conclusion: requiredText(conclusion, 'conclusion'),
    scope: requiredText(scope, 'scope'),
    generatedAt: requiredText(generatedAt, 'generatedAt'),
    engineVersion: requiredText(engineVersion, 'engineVersion'),
    method: 'Explication traçable fondée exclusivement sur des campagnes, critères, preuves, contradictions et limites identifiés.',
    references: Object.freeze(normalizedReferences),
    campaigns: Object.freeze(grouped.campaigns),
    criteria: Object.freeze(grouped.criteria),
    evidence: Object.freeze(grouped.evidence),
    contradictions: Object.freeze(grouped.contradictions),
    limitations: Object.freeze(grouped.limitations),
    decisionsNotSupported: Object.freeze(unsupported),
    blockers: Object.freeze(blockers),
    isPublishable: blockers.length === 0,
    guardrails: Object.freeze([
      'Cette explication ne constitue pas une recommandation d’achat ou de vente.',
      'La conclusion reste conditionnelle au périmètre, aux données et aux hypothèses référencés.',
      'Aucun niveau de confiance, niveau de preuve ou IGL n’est inventé par ce moteur.',
      'Les contradictions et limites doivent rester visibles dans toute restitution utilisateur.'
    ])
  });
}
