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

function normalizeRule(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`rules[${index}] doit être un objet.`);
  const requiredStatuses = Object.fromEntries(
    Object.entries(input.requiredStatuses ?? {}).map(([criterionId, status]) => {
      const normalizedStatus = requiredText(status, `rules[${index}].requiredStatuses.${criterionId}`);
      if (!['concordant', 'contradictory', 'incomplete'].includes(normalizedStatus)) {
        throw new TypeError(`Statut requis inconnu : ${normalizedStatus}.`);
      }
      return [requiredText(criterionId, `rules[${index}].requiredStatuses.criterionId`), normalizedStatus];
    })
  );
  if (Object.keys(requiredStatuses).length === 0) throw new TypeError(`rules[${index}].requiredStatuses doit contenir au moins un critère.`);
  return Object.freeze({
    ruleId: requiredText(input.ruleId, `rules[${index}].ruleId`),
    level: requiredText(input.level, `rules[${index}].level`),
    calibrationReference: requiredText(input.calibrationReference, `rules[${index}].calibrationReference`),
    method: requiredText(input.method, `rules[${index}].method`),
    requiredStatuses: Object.freeze(requiredStatuses),
    limitations: Object.freeze(requiredArray(input.limitations, `rules[${index}].limitations`, 1)
      .map((value, limitationIndex) => requiredText(value, `rules[${index}].limitations[${limitationIndex}]`)))
  });
}

export function classifyEvidenceLevel({ conclusionId, crossValidation, rules, classifierVersion }) {
  if (!crossValidation || typeof crossValidation !== 'object' || Array.isArray(crossValidation)) {
    throw new TypeError('crossValidation doit être un objet.');
  }
  const normalizedRules = requiredArray(rules, 'rules', 1).map(normalizeRule)
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  const seen = new Set();
  for (const rule of normalizedRules) {
    if (seen.has(rule.ruleId)) throw new Error(`ruleId dupliqué : ${rule.ruleId}.`);
    seen.add(rule.ruleId);
  }

  const blockers = [...(crossValidation.blockers ?? [])].map((value, index) => requiredText(value, `crossValidation.blockers[${index}]`));
  const evaluations = requiredArray(crossValidation.evaluations, 'crossValidation.evaluations', 1);
  const statuses = Object.fromEntries(evaluations.map((evaluation, index) => [
    requiredText(evaluation.criterionId, `crossValidation.evaluations[${index}].criterionId`),
    requiredText(evaluation.status, `crossValidation.evaluations[${index}].status`)
  ]));

  const matchingRules = blockers.length === 0
    ? normalizedRules.filter(rule => Object.entries(rule.requiredStatuses)
      .every(([criterionId, status]) => statuses[criterionId] === status))
    : [];

  const classificationBlockers = [...blockers];
  if (matchingRules.length === 0) classificationBlockers.push('no-calibrated-rule-matched');
  if (matchingRules.length > 1) classificationBlockers.push('ambiguous-calibrated-rules');

  const selectedRule = classificationBlockers.length === 0 ? matchingRules[0] : null;
  return deepFreeze({
    schemaVersion: 1,
    conclusionId: requiredText(conclusionId, 'conclusionId'),
    classifierVersion: requiredText(classifierVersion, 'classifierVersion'),
    level: selectedRule?.level ?? 'unclassified',
    ruleId: selectedRule?.ruleId ?? null,
    calibrationReference: selectedRule?.calibrationReference ?? null,
    method: selectedRule?.method ?? 'Aucune classification sans règle calibrée, non ambiguë et applicable.',
    criterionStatuses: Object.freeze(statuses),
    blockers: Object.freeze(classificationBlockers),
    isClassified: selectedRule !== null,
    limitations: Object.freeze(selectedRule?.limitations ?? [
      'Aucun niveau de preuve n’est affiché sans règle calibrée applicable.',
      'Les contradictions et lacunes empêchent la classification.',
      'Ce résultat ne constitue ni un niveau de confiance, ni un IGL, ni une recommandation d’investissement.'
    ])
  });
}
