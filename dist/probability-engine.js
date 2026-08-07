export const PROBABILITY_ENGINE_VERSION = 'stock-v0';
export const PROBABILITY_ENGINE_STATUS = 'experimental';

export const SUPPORTED_HORIZONS = Object.freeze(['1m', '3m', '6m', '12m']);

function emptyHorizon() {
  return {
    probabilityPositiveReturn: null,
    probabilityOutperformBenchmark: null,
    probabilityDrawdown20: null,
    expectedReturnRange: null,
    confidence: null
  };
}

export function createEmptyProbabilityAnalysis({
  symbol,
  isin = null,
  assetType = 'stock',
  benchmark = null,
  asOf = new Date().toISOString()
}) {
  if (!symbol) throw new Error('Un symbole marché est requis pour créer une analyse.');

  return {
    instrument: {
      symbol: String(symbol).trim().toUpperCase(),
      isin: isin ? String(isin).trim().toUpperCase() : null,
      assetType,
      benchmark
    },
    asOf,
    modelVersion: PROBABILITY_ENGINE_VERSION,
    status: PROBABILITY_ENGINE_STATUS,
    horizons: Object.fromEntries(SUPPORTED_HORIZONS.map(horizon => [horizon, emptyHorizon()])),
    evidence: {
      positive: [],
      negative: [],
      dataCoverage: [],
      missingData: []
    },
    validation: {
      sampleSize: null,
      brierScore: null,
      calibrationError: null,
      backtestPeriod: null
    }
  };
}

export function hasPublishableProbability(horizonAnalysis) {
  if (!horizonAnalysis) return false;
  const probability = Number(horizonAnalysis.probabilityPositiveReturn);
  const confidence = Number(horizonAnalysis.confidence);
  return Number.isFinite(probability) && probability >= 0 && probability <= 1 &&
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

export function isOpportunityEligible(analysis, horizon) {
  if (!analysis || analysis.status !== 'validated') return false;
  if (!SUPPORTED_HORIZONS.includes(horizon)) return false;
  if (!hasPublishableProbability(analysis.horizons?.[horizon])) return false;

  const validation = analysis.validation || {};
  return Number.isFinite(Number(validation.sampleSize)) && Number(validation.sampleSize) > 0 &&
    Number.isFinite(Number(validation.brierScore)) &&
    Number.isFinite(Number(validation.calibrationError));
}

export function formatProbability(value, locale = 'fr-FR') {
  const probability = Number(value);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(probability);
}
