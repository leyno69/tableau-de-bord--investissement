function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} doit être un objet.`);
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const ALLOWED_STATUSES = new Set(['satisfied', 'unsatisfied', 'not-evaluated']);

function normalizeCriterion(input, index) {
  const criterion = requiredObject(input, `criteria[${index}]`);
  const status = requiredText(criterion.status, `criteria[${index}].status`);
  if (!ALLOWED_STATUSES.has(status)) {
    throw new TypeError(`criteria[${index}].status doit être satisfied, unsatisfied ou not-evaluated.`);
  }

  const calibrationReference = criterion.calibrationReference == null
    ? null
    : requiredText(criterion.calibrationReference, `criteria[${index}].calibrationReference`);

  return Object.freeze({
    id: requiredText(criterion.id, `criteria[${index}].id`),
    label: requiredText(criterion.label, `criteria[${index}].label`),
    method: requiredText(criterion.method, `criteria[${index}].method`),
    acceptanceRule: requiredText(criterion.acceptanceRule, `criteria[${index}].acceptanceRule`),
    calibrationReference,
    status,
    observation: requiredText(criterion.observation, `criteria[${index}].observation`),
    limitations: Object.freeze((criterion.limitations ?? []).map((value, limitationIndex) =>
      requiredText(value, `criteria[${index}].limitations[${limitationIndex}]`)))
  });
}

export function buildConfidenceContract({ methodologySynthesis, criteria, protocol }) {
  const synthesis = requiredObject(methodologySynthesis, 'methodologySynthesis');
  const normalizedProtocol = requiredObject(protocol, 'protocol');

  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new TypeError('criteria doit contenir au moins un critère.');
  }

  const normalizedCriteria = criteria
    .map(normalizeCriterion)
    .sort((left, right) => left.id.localeCompare(right.id));

  const ids = new Set();
  normalizedCriteria.forEach((criterion) => {
    if (ids.has(criterion.id)) throw new Error(`Critère dupliqué : ${criterion.id}.`);
    ids.add(criterion.id);
  });

  const methodologyComplete = synthesis.isComplete === true;
  const uncalibratedCriteria = normalizedCriteria
    .filter(criterion => criterion.calibrationReference === null)
    .map(criterion => criterion.id);
  const unevaluatedCriteria = normalizedCriteria
    .filter(criterion => criterion.status === 'not-evaluated')
    .map(criterion => criterion.id);
  const unsatisfiedCriteria = normalizedCriteria
    .filter(criterion => criterion.status === 'unsatisfied')
    .map(criterion => criterion.id);

  const blockers = [
    ...(!methodologyComplete ? ['methodology-incomplete'] : []),
    ...uncalibratedCriteria.map(id => `uncalibrated:${id}`),
    ...unevaluatedCriteria.map(id => `not-evaluated:${id}`),
    ...unsatisfiedCriteria.map(id => `unsatisfied:${id}`)
  ];

  const conclusion = blockers.length === 0
    ? 'eligible-for-confidence-calibration'
    : 'blocked';

  return deepFreeze({
    schemaVersion: 1,
    method: 'Contrat auditable préalable à toute classification du niveau de confiance LEYNOR.',
    protocol: {
      id: requiredText(normalizedProtocol.id, 'protocol.id'),
      version: requiredText(normalizedProtocol.version, 'protocol.version'),
      description: requiredText(normalizedProtocol.description, 'protocol.description')
    },
    methodologyComplete,
    criteria: normalizedCriteria,
    criterionCount: normalizedCriteria.length,
    satisfiedCriterionCount: normalizedCriteria.filter(item => item.status === 'satisfied').length,
    uncalibratedCriteria,
    unevaluatedCriteria,
    unsatisfiedCriteria,
    blockers,
    conclusion,
    confidenceLevel: null,
    confidenceScore: null,
    limitations: [
      'Ce contrat ne calcule aucun score ni niveau de confiance.',
      'Une règle d’acceptation doit être reliée à une référence de calibration vérifiable avant utilisation.',
      'L’absence de blocage rend seulement l’étude éligible à une future calibration ; elle ne prouve pas une confiance élevée.',
      'Ce contrat ne constitue ni un niveau de preuve, ni un IGL, ni une recommandation d’investissement.'
    ]
  });
}
