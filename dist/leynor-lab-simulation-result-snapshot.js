function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}
function finite(value, field) {
  if (!Number.isFinite(value)) throw new TypeError(`${field} doit être un nombre fini.`);
  return value;
}

export function createSimulationResultSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const percentiles = Object.fromEntries(Object.entries(input.percentiles ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, finite(value, `percentiles.${key}`)]));
  if (Object.keys(percentiles).length === 0) throw new Error('Les percentiles sont requis.');
  return Object.freeze({
    schemaVersion: 1,
    snapshotId: text(input.snapshotId, 'snapshotId'),
    campaignId: text(input.campaignId, 'campaignId'),
    executionId: text(input.executionId, 'executionId'),
    seedPlanId: text(input.seedPlanId, 'seedPlanId'),
    generatedAt: text(input.generatedAt, 'generatedAt'),
    completedRuns: Number.isInteger(input.completedRuns) && input.completedRuns > 0 ? input.completedRuns : (() => { throw new TypeError('completedRuns invalide.'); })(),
    finalValueMean: finite(input.finalValueMean, 'finalValueMean'),
    returnMean: finite(input.returnMean, 'returnMean'),
    volatilityMean: finite(input.volatilityMean, 'volatilityMean'),
    maxDrawdownMean: finite(input.maxDrawdownMean, 'maxDrawdownMean'),
    lossFrequency: finite(input.lossFrequency, 'lossFrequency'),
    recoveryDurationMean: finite(input.recoveryDurationMean, 'recoveryDurationMean'),
    goalProbability: finite(input.goalProbability, 'goalProbability'),
    percentiles: Object.freeze(percentiles),
    assumptions: Object.freeze([...(input.assumptions ?? [])].map((item, index) => text(item, `assumptions[${index}]`))),
    limitations: Object.freeze([...(input.limitations ?? [])].map((item, index) => text(item, `limitations[${index}]`)))
  });
}
