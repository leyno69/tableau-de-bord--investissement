function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

export function auditSimulationCampaign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const blockers = [];
  const requiredRefs = ['campaignId','campaignSpecId','datasetLineageId','reproducibilityBundleId','seedPlanId','batchPlanId','executionId','resultSnapshotId'];
  for (const field of requiredRefs) {
    try { nonEmpty(input[field], field); } catch { blockers.push(`missing-${field}`); }
  }
  if (input.executionStatus !== 'completed') blockers.push('execution-not-completed');
  if (input.completedBatches !== input.totalBatches || !Number.isInteger(input.totalBatches) || input.totalBatches < 1) blockers.push('batches-incomplete');
  if (input.completedReplications !== input.plannedReplications || !Number.isInteger(input.plannedReplications) || input.plannedReplications < 2) blockers.push('replications-incomplete');
  if (input.metricsComplete !== true) blockers.push('metrics-incomplete');
  if (input.percentilesComplete !== true) blockers.push('percentiles-incomplete');
  if (input.assumptionsDocumented !== true) blockers.push('assumptions-undocumented');
  if (input.limitationsDocumented !== true) blockers.push('limitations-undocumented');
  if (input.nonPredictionNoticePresent !== true) blockers.push('non-prediction-notice-missing');
  if (input.dataIntegrityVerified !== true) blockers.push('data-integrity-unverified');
  return Object.freeze({
    schemaVersion: 1,
    campaignId: nonEmpty(input.campaignId, 'campaignId'),
    passed: blockers.length === 0,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    decision: blockers.length === 0 ? 'publishable-for-methodological-review' : 'blocked'
  });
}
