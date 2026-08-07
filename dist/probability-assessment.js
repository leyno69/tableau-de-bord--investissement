function text(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError(`${name} est obligatoire.`);
  return normalized;
}

function list(values, name, { required = true } = {}) {
  if (!Array.isArray(values)) throw new TypeError(`${name} doit être une liste.`);
  const normalized = values.map(value => String(value).trim()).filter(Boolean);
  if (required && !normalized.length) throw new TypeError(`${name} doit contenir au moins un élément.`);
  return Object.freeze(normalized);
}

export function createProbabilityAssessment({
  probability,
  event,
  horizon,
  method,
  evidence,
  assumptions,
  limitations,
  counterEvidence = [],
  dataFreshness = 'non renseignée'
} = {}) {
  const numericProbability = Number(probability);
  if (!Number.isFinite(numericProbability) || numericProbability < 0 || numericProbability > 1) {
    throw new TypeError('probability doit être comprise entre 0 et 1.');
  }

  return Object.freeze({
    probability: numericProbability,
    event: text(event, 'event'),
    horizon: text(horizon, 'horizon'),
    method: text(method, 'method'),
    evidence: list(evidence, 'evidence'),
    assumptions: list(assumptions, 'assumptions'),
    limitations: list(limitations, 'limitations'),
    counterEvidence: list(counterEvidence, 'counterEvidence', { required: false }),
    dataFreshness: text(dataFreshness, 'dataFreshness')
  });
}

export function validateProbabilityAssessment(assessment) {
  return createProbabilityAssessment(assessment);
}

export function probabilityLabel(probability) {
  return `${Math.round(Number(probability) * 100)} %`;
}
