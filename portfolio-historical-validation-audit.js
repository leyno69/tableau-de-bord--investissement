export function auditPortfolioForHistoricalValidation(preset) {
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) throw new TypeError('preset doit être un objet.');
  const blockers = [];
  const text = value => typeof value === 'string' && value.trim() !== '';
  if (!text(preset.id)) blockers.push('missing-portfolio-id');
  if (!text(preset.label)) blockers.push('missing-portfolio-label');
  if (!Number.isFinite(Number(preset.horizonYears)) || Number(preset.horizonYears) <= 0) blockers.push('invalid-horizon');
  if (!Array.isArray(preset.allocation) || preset.allocation.length === 0) blockers.push('invalid-allocation');
  if (!Array.isArray(preset.orders) || preset.orders.length === 0) blockers.push('missing-initial-orders');
  for (const [field, blocker] of [
    ['referenceDate', 'missing-reference-date'],
    ['rebalancingPolicy', 'missing-rebalancing-policy'],
    ['costPolicy', 'missing-cost-policy'],
    ['engineVersion', 'missing-engine-version'],
    ['campaignId', 'missing-campaign-id'],
    ['seedPlanId', 'missing-seed-plan-id'],
    ['resultSnapshotId', 'missing-result-snapshot-id'],
  ]) if (!text(preset[field])) blockers.push(blocker);
  const uniqueBlockers = Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
    schemaVersion: 1,
    portfolioId: text(preset.id) ? preset.id.trim() : null,
    label: text(preset.label) ? preset.label.trim() : null,
    eligibleForHistoricalReplay: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
  });
}

export function buildPortfolioHistoricalValidationRegistry(presets) {
  if (!Array.isArray(presets)) throw new TypeError('presets doit être un tableau.');
  const ids = new Set();
  const entries = presets.map(preset => {
    const audit = auditPortfolioForHistoricalValidation(preset);
    if (audit.portfolioId !== null) {
      if (ids.has(audit.portfolioId)) throw new TypeError(`portfolioId dupliqué: ${audit.portfolioId}`);
      ids.add(audit.portfolioId);
    }
    return audit;
  });
  return Object.freeze({
    schemaVersion: 1,
    portfolioCount: entries.length,
    eligibleCount: entries.filter(entry => entry.eligibleForHistoricalReplay).length,
    blockedCount: entries.filter(entry => !entry.eligibleForHistoricalReplay).length,
    entries: Object.freeze(entries),
  });
}
