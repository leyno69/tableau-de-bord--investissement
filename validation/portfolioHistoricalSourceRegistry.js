function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function bool(value) { return value === true; }

const VALIDATION_REQUIREMENTS = Object.freeze([
  'licenseVerified',
  'researchUseAllowed',
  'pointInTimeVerified',
  'corporateActionsVerified',
  'adjustmentMethodDocumented',
  'revisionPolicyDocumented',
  'coverageVerified'
]);

export function assessHistoricalSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('source doit être un objet.');
  const id = nonEmpty(source.id, 'id');
  const provider = nonEmpty(source.provider, 'provider');
  const evidence = Array.isArray(source.evidence) ? source.evidence.map((item, index) => nonEmpty(item, `evidence[${index}]`)) : [];
  const blockers = VALIDATION_REQUIREMENTS.filter(field => !bool(source[field]));
  if (evidence.length === 0) blockers.push('evidence');

  const validationEligible = blockers.length === 0;
  const developmentEligible = bool(source.apiOperational) && bool(source.schemaDocumented);

  return Object.freeze({
    schemaVersion: 1,
    id,
    provider,
    developmentEligible,
    validationEligible,
    status: validationEligible ? 'validation-eligible' : developmentEligible ? 'development-only' : 'blocked',
    blockers: Object.freeze([...new Set(blockers)].sort()),
    evidence: Object.freeze([...evidence].sort())
  });
}

export function buildHistoricalSourceRegistry(sources) {
  if (!Array.isArray(sources) || sources.length === 0) throw new TypeError('sources doit être un tableau non vide.');
  const assessed = sources.map(assessHistoricalSource);
  const ids = new Set();
  for (const source of assessed) {
    if (ids.has(source.id)) throw new TypeError(`source dupliquée: ${source.id}`);
    ids.add(source.id);
  }
  const entries = [...assessed].sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({
    schemaVersion: 1,
    entries: Object.freeze(entries),
    counts: Object.freeze({
      total: entries.length,
      validationEligible: entries.filter(item => item.validationEligible).length,
      developmentOnly: entries.filter(item => item.status === 'development-only').length,
      blocked: entries.filter(item => item.status === 'blocked').length
    })
  });
}

export const twelveDataHistoricalCandidate = Object.freeze({
  id: 'twelve-data-v1',
  provider: 'Twelve Data',
  apiOperational: true,
  schemaDocumented: true,
  licenseVerified: false,
  researchUseAllowed: false,
  pointInTimeVerified: false,
  corporateActionsVerified: false,
  adjustmentMethodDocumented: false,
  revisionPolicyDocumented: false,
  coverageVerified: false,
  evidence: Object.freeze([
    'docs/twelve-data-provider.md',
    'docs/twelve-data-temporal-gate.md',
    'docs/twelve-data-acquisition-registry.md'
  ])
});
