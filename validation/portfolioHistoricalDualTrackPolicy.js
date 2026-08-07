import { findHistoricalProxyCandidates, approveHistoricalProxy } from './portfolioHistoricalProxyRegistry.js';

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

export function createDualTrackHistoricalPolicy({
  protocolId,
  sourceTicker,
  exactInstrumentStart,
  extendedProxyRequired,
  proxyJustification,
  selectedBeforeOutcomeAccess,
  limitationsAccepted
}) {
  const normalizedProtocolId = nonEmpty(protocolId, 'protocolId');
  const ticker = nonEmpty(sourceTicker, 'sourceTicker').toUpperCase();
  const exactStart = nonEmpty(exactInstrumentStart, 'exactInstrumentStart');
  const exactTrack = Object.freeze({
    id: `${normalizedProtocolId}:${ticker}:exact`,
    kind: 'exact-instrument',
    sourceTicker: ticker,
    start: exactStart,
    resultNamespace: 'exact',
    mayBePresentedAsInstrumentHistory: true
  });

  if (extendedProxyRequired !== true) {
    return Object.freeze({
      schemaVersion: 1,
      protocolId: normalizedProtocolId,
      sourceTicker: ticker,
      exactTrack,
      proxyTrack: null,
      combineTracks: false,
      combinedInstrumentHistoryAllowed: false
    });
  }

  const candidates = findHistoricalProxyCandidates(ticker);
  if (candidates.length !== 1) throw new TypeError(`un proxy officiel unique est requis pour ${ticker}.`);
  const proxy = approveHistoricalProxy(candidates[0], {
    protocolId: normalizedProtocolId,
    justification: nonEmpty(proxyJustification, 'proxyJustification'),
    selectedBeforeOutcomeAccess,
    limitationsAccepted
  });

  const proxyTrack = Object.freeze({
    id: `${normalizedProtocolId}:${ticker}:proxy`,
    kind: 'benchmark-proxy',
    sourceTicker: ticker,
    proxyId: proxy.proxyId,
    benchmark: proxy.benchmark,
    returnBasis: proxy.returnBasis,
    currency: proxy.currency,
    resultNamespace: 'proxy',
    mayBePresentedAsInstrumentHistory: false,
    limitations: proxy.limitations
  });

  return Object.freeze({
    schemaVersion: 1,
    protocolId: normalizedProtocolId,
    sourceTicker: ticker,
    exactTrack,
    proxyTrack,
    combineTracks: false,
    combinedInstrumentHistoryAllowed: false
  });
}

export function validateDualTrackResultLabels(policy, results) {
  if (!Array.isArray(results) || results.length === 0) throw new TypeError('results doit être un tableau non vide.');
  const allowed = new Set(['exact', ...(policy.proxyTrack ? ['proxy'] : [])]);
  for (const result of results) {
    if (!allowed.has(result.track)) throw new TypeError(`track invalide: ${result.track}`);
    if (result.track === 'proxy' && result.labelAsExactInstrument === true) {
      throw new TypeError('un résultat proxy ne peut pas être étiqueté comme historique exact.');
    }
  }
  return true;
}
