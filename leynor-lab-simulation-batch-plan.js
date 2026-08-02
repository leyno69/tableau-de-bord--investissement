function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createSimulationBatchPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  if (!Number.isInteger(input.totalRuns) || input.totalRuns < 1) throw new TypeError('totalRuns invalide.');
  if (!Number.isInteger(input.batchSize) || input.batchSize < 1) throw new TypeError('batchSize invalide.');
  const batchCount = Math.ceil(input.totalRuns / input.batchSize);
  const batches = Array.from({ length: batchCount }, (_, index) => {
    const start = index * input.batchSize;
    const size = Math.min(input.batchSize, input.totalRuns - start);
    return Object.freeze({ batchId: `${input.campaignId}-batch-${String(index + 1).padStart(4, '0')}`, offset: start, size });
  });
  return Object.freeze({
    schemaVersion: 1,
    planId: text(input.planId, 'planId'),
    campaignId: text(input.campaignId, 'campaignId'),
    totalRuns: input.totalRuns,
    batchSize: input.batchSize,
    batchCount,
    maxConcurrency: Number.isInteger(input.maxConcurrency) && input.maxConcurrency > 0 ? input.maxConcurrency : 1,
    batches: Object.freeze(batches)
  });
}
