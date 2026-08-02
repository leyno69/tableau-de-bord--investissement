function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}
function array(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} doit contenir au moins un élément.`);
  return Object.freeze(value.map((item, index) => text(item, `${field}[${index}]`)));
}

export function createSimulationCampaignSpec(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  if (!Number.isInteger(input.portfolioCount) || input.portfolioCount < 1) throw new TypeError('portfolioCount doit être un entier positif.');
  if (!Number.isInteger(input.seed) || input.seed < 0) throw new TypeError('seed doit être un entier positif ou nul.');
  const horizonsYears = [...(input.horizonsYears ?? [])].map(Number).sort((a, b) => a - b);
  if (horizonsYears.length === 0 || horizonsYears.some(value => !Number.isFinite(value) || value <= 0)) throw new TypeError('horizonsYears invalide.');
  const metrics = array(input.metrics, 'metrics');
  const requiredMetrics = ['final-value', 'return', 'volatility', 'max-drawdown', 'loss-frequency', 'recovery-duration', 'goal-probability', 'percentiles'];
  const missing = requiredMetrics.filter(metric => !metrics.includes(metric));
  if (missing.length > 0) throw new Error(`Métriques obligatoires absentes : ${missing.join(', ')}.`);
  return Object.freeze({
    schemaVersion: 1,
    campaignId: text(input.campaignId, 'campaignId'),
    objective: text(input.objective, 'objective'),
    methodologyReleaseId: text(input.methodologyReleaseId, 'methodologyReleaseId'),
    datasetLineageId: text(input.datasetLineageId, 'datasetLineageId'),
    reproducibilityBundleId: text(input.reproducibilityBundleId, 'reproducibilityBundleId'),
    portfolioCount: input.portfolioCount,
    seed: input.seed,
    horizonsYears: Object.freeze(horizonsYears),
    cohorts: array(input.cohorts, 'cohorts'),
    scenarios: array(input.scenarios, 'scenarios'),
    metrics,
    assumptions: array(input.assumptions, 'assumptions'),
    limitations: array(input.limitations, 'limitations'),
    cancellationSupported: input.cancellationSupported === true,
    progressReportingSupported: input.progressReportingSupported === true,
    status: 'prepared'
  });
}
