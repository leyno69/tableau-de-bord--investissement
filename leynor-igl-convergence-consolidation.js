const DEFAULT_OPTIONS = Object.freeze({
  stableDispersion: 0.05,
  maximumEffectDrift: 0.02,
  minimumIndependentCampaigns: 2,
  minimumStableShare: 0.8,
});

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('values must be a non-empty array');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function normalizedOptions(options = {}) {
  const normalized = {
    stableDispersion: options.stableDispersion ?? DEFAULT_OPTIONS.stableDispersion,
    maximumEffectDrift: options.maximumEffectDrift ?? DEFAULT_OPTIONS.maximumEffectDrift,
    minimumIndependentCampaigns: options.minimumIndependentCampaigns ?? DEFAULT_OPTIONS.minimumIndependentCampaigns,
    minimumStableShare: options.minimumStableShare ?? DEFAULT_OPTIONS.minimumStableShare,
  };
  assertFiniteNonNegative(normalized.stableDispersion, 'stableDispersion');
  assertFiniteNonNegative(normalized.maximumEffectDrift, 'maximumEffectDrift');
  if (!Number.isInteger(normalized.minimumIndependentCampaigns) || normalized.minimumIndependentCampaigns < 1) {
    throw new RangeError('minimumIndependentCampaigns must be a positive integer');
  }
  if (!(normalized.minimumStableShare > 0 && normalized.minimumStableShare <= 1)) {
    throw new RangeError('minimumStableShare must be in (0, 1]');
  }
  return Object.freeze(normalized);
}

export function summarizeConvergence(cells, options = {}) {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new RangeError('cells must be a non-empty array');
  }
  const thresholds = normalizedOptions(options);
  const normalizedCells = cells.map((cell) => {
    if (!cell?.cellKey) throw new TypeError('each cell requires cellKey');
    assertFiniteNonNegative(cell.relativeDispersion, 'relativeDispersion');
    assertFiniteNonNegative(cell.effectDrift, 'effectDrift');
    const stable = cell.relativeDispersion <= thresholds.stableDispersion
      && cell.effectDrift <= thresholds.maximumEffectDrift;
    return Object.freeze({ ...cell, stable });
  });

  const dispersions = normalizedCells.map((cell) => cell.relativeDispersion);
  const drifts = normalizedCells.map((cell) => cell.effectDrift);
  const stableCount = normalizedCells.filter((cell) => cell.stable).length;
  const stableShare = stableCount / normalizedCells.length;

  return Object.freeze({
    cellCount: normalizedCells.length,
    stableCount,
    unstableCount: normalizedCells.length - stableCount,
    stableShare,
    medianDispersion: median(dispersions),
    p90Dispersion: percentile(dispersions, 0.9),
    maximumDispersion: Math.max(...dispersions),
    medianEffectDrift: median(drifts),
    p90EffectDrift: percentile(drifts, 0.9),
    converged: stableShare >= thresholds.minimumStableShare,
    thresholds,
    cells: Object.freeze(normalizedCells),
  });
}

export function assessCandidateEvidence(campaignSummaries, options = {}) {
  if (!Array.isArray(campaignSummaries) || campaignSummaries.length === 0) {
    throw new RangeError('campaignSummaries must be a non-empty array');
  }
  const thresholds = normalizedOptions(options);
  const convergedCampaigns = campaignSummaries.filter((campaign) => campaign?.converged === true);
  const independentCampaignCount = new Set(
    campaignSummaries.map((campaign) => campaign.campaignId).filter(Boolean),
  ).size;
  const sufficientIndependentEvidence = independentCampaignCount >= thresholds.minimumIndependentCampaigns;
  const allConverged = convergedCampaigns.length === campaignSummaries.length;

  const status = allConverged && sufficientIndependentEvidence
    ? 'eligible-for-validation'
    : 'insufficient-evidence';

  return Object.freeze({
    status,
    campaignCount: campaignSummaries.length,
    independentCampaignCount,
    convergedCampaignCount: convergedCampaigns.length,
    sufficientIndependentEvidence,
    allConverged,
    notice: status === 'eligible-for-validation'
      ? 'Candidate may enter validation; no IGL weight is authorized yet.'
      : 'Candidate must remain excluded from IGL calibration.',
  });
}

export function buildConvergenceRegister(entries, options = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  const grouped = new Map();
  for (const entry of entries) {
    if (!entry?.candidateId || !entry?.campaignId || !Array.isArray(entry.cells)) {
      throw new TypeError('each entry requires candidateId, campaignId and cells');
    }
    const summary = summarizeConvergence(entry.cells, options);
    const candidateCampaigns = grouped.get(entry.candidateId) ?? [];
    candidateCampaigns.push(Object.freeze({ campaignId: entry.campaignId, ...summary }));
    grouped.set(entry.candidateId, candidateCampaigns);
  }

  const candidates = [...grouped.entries()]
    .map(([candidateId, campaigns]) => Object.freeze({
      candidateId,
      campaigns: Object.freeze(campaigns),
      evidence: assessCandidateEvidence(campaigns, options),
    }))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));

  return Object.freeze({
    generatedAt: null,
    candidateCount: candidates.length,
    candidates: Object.freeze(candidates),
    notice: 'This register records convergence evidence only. It does not define an IGL score or weight.',
  });
}
