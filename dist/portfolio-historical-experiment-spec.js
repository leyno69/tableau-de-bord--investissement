function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} doit être strictement positif.`);
  return number;
}

function normalizeAllocation(allocation) {
  if (!Array.isArray(allocation) || allocation.length === 0) throw new TypeError('allocation doit être un tableau non vide.');
  const normalized = allocation.map(item => Object.freeze({
    label: text(item?.label, 'allocation.label'),
    weight: positiveNumber(item?.weight, 'allocation.weight'),
  }));
  const total = normalized.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(total - 1) > 1e-9) throw new TypeError('allocation doit totaliser 1.');
  return Object.freeze(normalized);
}

function normalizeDate(value) {
  const date = text(value, 'referenceDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new TypeError('referenceDate doit être une date ISO YYYY-MM-DD valide.');
  }
  return date;
}

function fingerprint(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function sealPortfolioHistoricalExperimentSpec(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const engineCommitSha = text(input.engineCommitSha, 'engineCommitSha').toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(engineCommitSha)) throw new TypeError('engineCommitSha doit être un SHA Git complet de 40 caractères.');

  const core = Object.freeze({
    schemaVersion: 1,
    specId: text(input.specId, 'specId'),
    sourcePresetId: text(input.sourcePresetId, 'sourcePresetId'),
    methodologyVersion: text(input.methodologyVersion, 'methodologyVersion'),
    engineCommitSha,
    referenceDate: normalizeDate(input.referenceDate),
    horizonYears: positiveNumber(input.horizonYears, 'horizonYears'),
    allocation: normalizeAllocation(input.allocation),
    rebalancingPolicyId: text(input.rebalancingPolicyId, 'rebalancingPolicyId'),
    costPolicyId: text(input.costPolicyId, 'costPolicyId'),
    campaignId: text(input.campaignId, 'campaignId'),
    seedPlanId: text(input.seedPlanId, 'seedPlanId'),
    resultSnapshotId: text(input.resultSnapshotId, 'resultSnapshotId'),
  });

  return Object.freeze({
    ...core,
    fingerprint: fingerprint(core),
    status: 'sealed',
  });
}
