function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
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

function normalizeCriterion(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`criteria[${index}] doit être un objet.`);
  }
  const status = requiredText(input.status, `criteria[${index}].status`);
  if (!['satisfied', 'unsatisfied', 'not-evaluated'].includes(status)) {
    throw new TypeError(`Statut de critère inconnu : ${status}.`);
  }
  return Object.freeze({
    criterionId: requiredText(input.criterionId, `criteria[${index}].criterionId`),
    method: requiredText(input.method, `criteria[${index}].method`),
    acceptanceRule: requiredText(input.acceptanceRule, `criteria[${index}].acceptanceRule`),
    observation: requiredText(input.observation, `criteria[${index}].observation`),
    calibrationReference: requiredText(input.calibrationReference, `criteria[${index}].calibrationReference`),
    independentlyReproduced: requiredBoolean(input.independentlyReproduced, `criteria[${index}].independentlyReproduced`),
    holdoutValidated: requiredBoolean(input.holdoutValidated, `criteria[${index}].holdoutValidated`),
    contradictionsReviewed: requiredBoolean(input.contradictionsReviewed, `criteria[${index}].contradictionsReviewed`),
    status,
    limitations: Object.freeze(requiredArray(input.limitations, `criteria[${index}].limitations`, 1)
      .map((value, limitationIndex) => requiredText(value, `criteria[${index}].limitations[${limitationIndex}]`)))
  });
}

export function buildEvidenceContract({ contractId, contractVersion, conclusionId, criteria }) {
  const normalizedCriteria = requiredArray(criteria, 'criteria', 1)
    .map(normalizeCriterion)
    .sort((left, right) => left.criterionId.localeCompare(right.criterionId));

  const seen = new Set();
  for (const criterion of normalizedCriteria) {
    if (seen.has(criterion.criterionId)) throw new Error(`criterionId dupliqué : ${criterion.criterionId}.`);
    seen.add(criterion.criterionId);
  }

  const blockers = [];
  for (const criterion of normalizedCriteria) {
    if (criterion.status !== 'satisfied') blockers.push(`${criterion.criterionId}:status-${criterion.status}`);
    if (!criterion.independentlyReproduced) blockers.push(`${criterion.criterionId}:not-independently-reproduced`);
    if (!criterion.holdoutValidated) blockers.push(`${criterion.criterionId}:missing-holdout-validation`);
    if (!criterion.contradictionsReviewed) blockers.push(`${criterion.criterionId}:contradictions-not-reviewed`);
  }

  return deepFreeze({
    schemaVersion: 1,
    contractId: requiredText(contractId, 'contractId'),
    contractVersion: requiredText(contractVersion, 'contractVersion'),
    conclusionId: requiredText(conclusionId, 'conclusionId'),
    criteria: Object.freeze(normalizedCriteria),
    blockers: Object.freeze(blockers),
    isEligibleForEvidenceClassification: blockers.length === 0,
    method: 'Contrat descriptif et auditable préalable à toute classification du niveau de preuve.',
    limitations: Object.freeze([
      'Ce contrat ne calcule aucun niveau de preuve.',
      'La satisfaction des critères ne démontre pas automatiquement la causalité ni la généralisation.',
      'Aucune pondération entre critères n’est appliquée.',
      'Ce contrat ne constitue ni un niveau de confiance, ni un IGL, ni une recommandation d’investissement.'
    ])
  });
}
