function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createSimulationExecutionState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  if (!Number.isInteger(input.completedBatches) || input.completedBatches < 0) throw new TypeError('completedBatches invalide.');
  if (!Number.isInteger(input.totalBatches) || input.totalBatches < 1 || input.completedBatches > input.totalBatches) throw new TypeError('totalBatches invalide.');
  const status = text(input.status, 'status');
  if (!['queued', 'running', 'cancel-requested', 'cancelled', 'completed', 'failed'].includes(status)) throw new Error(`Statut inconnu : ${status}.`);
  if (status === 'completed' && input.completedBatches !== input.totalBatches) throw new Error('Une exécution terminée exige tous les lots complétés.');
  const progress = input.completedBatches / input.totalBatches;
  return Object.freeze({
    schemaVersion: 1,
    executionId: text(input.executionId, 'executionId'),
    campaignId: text(input.campaignId, 'campaignId'),
    status,
    completedBatches: input.completedBatches,
    totalBatches: input.totalBatches,
    progress,
    lastCompletedBatchId: input.lastCompletedBatchId == null ? null : text(input.lastCompletedBatchId, 'lastCompletedBatchId'),
    cancellationReason: input.cancellationReason == null ? null : text(input.cancellationReason, 'cancellationReason'),
    errorCode: input.errorCode == null ? null : text(input.errorCode, 'errorCode')
  });
}
