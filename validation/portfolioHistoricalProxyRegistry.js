function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

export const historicalProxyRegistryV1 = Object.freeze([
  Object.freeze({
    sourceTicker: 'WPEA',
    proxyId: 'msci-world-net-tr-eur',
    proxyType: 'issuer-benchmark-index',
    benchmark: 'MSCI World Index',
    returnBasis: 'net-total-return',
    currency: 'EUR',
    source: 'https://www.blackrock.com/fr/particuliers/products/335178/ishares-msci-world-swap-pea-ucits-etf',
    status: 'candidate',
    limitations: Object.freeze([
      'index-is-not-investable-fund',
      'fund-fees-not-embedded',
      'swap-spread-not-reconstructed',
      'tracking-error-not-reconstructed'
    ])
  }),
  Object.freeze({
    sourceTicker: 'PAEJ',
    proxyId: 'msci-ac-asia-pacific-ex-japan-net-tr-usd',
    proxyType: 'issuer-benchmark-index',
    benchmark: 'MSCI Daily TR Net AC Asia Pacific Ex Japan USD',
    returnBasis: 'net-total-return',
    currency: 'USD',
    source: 'https://www.amundietf.fr/pdfDocuments/monthly-factsheet/FR0011869312/FRA/FRA/INSTITUTIONNEL/ETF',
    status: 'candidate',
    limitations: Object.freeze([
      'index-is-not-investable-fund',
      'fund-fees-not-embedded',
      'synthetic-replication-costs-not-reconstructed',
      'currency-conversion-required-for-eur-portfolio'
    ])
  }),
  Object.freeze({
    sourceTicker: 'SMH-US',
    proxyId: 'mvis-us-listed-semiconductor-25-tr',
    proxyType: 'issuer-benchmark-index',
    benchmark: 'MVIS US Listed Semiconductor 25 Index',
    returnBasis: 'total-return',
    currency: 'USD',
    source: 'https://vaneck.com/us/en/investments/semiconductor-etf-smh/',
    status: 'candidate',
    limitations: Object.freeze(['index-is-not-investable-fund','fund-fees-not-embedded','tracking-error-not-reconstructed'])
  }),
  Object.freeze({
    sourceTicker: 'SMH-EU',
    proxyId: 'marketvector-us-listed-semiconductor-10-capped-screened',
    proxyType: 'issuer-benchmark-index',
    benchmark: 'MarketVector US Listed Semiconductor 10% Capped Screened Index',
    returnBasis: 'total-return',
    currency: 'USD',
    source: 'https://www.vaneck.com/FR/en/investments/semiconductor-etf/index/',
    status: 'candidate',
    limitations: Object.freeze(['index-is-not-investable-fund','fund-fees-not-embedded','tracking-error-not-reconstructed','screening-methodology-differs-from-us-smh'])
  })
]);

export function findHistoricalProxyCandidates(sourceTicker) {
  const ticker = nonEmpty(sourceTicker, 'sourceTicker').toUpperCase();
  return Object.freeze(historicalProxyRegistryV1.filter(item => item.sourceTicker === ticker));
}

export function approveHistoricalProxy(candidate, approval) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate doit être un objet.');
  if (!approval || typeof approval !== 'object') throw new TypeError('approval doit être un objet.');
  const protocolId = nonEmpty(approval.protocolId, 'protocolId');
  const justification = nonEmpty(approval.justification, 'justification');
  if (approval.selectedBeforeOutcomeAccess !== true) throw new TypeError('selectedBeforeOutcomeAccess doit être true.');
  if (approval.limitationsAccepted !== true) throw new TypeError('limitationsAccepted doit être true.');
  return Object.freeze({
    ...candidate,
    status: 'approved-for-protocol',
    protocolId,
    justification,
    selectedBeforeOutcomeAccess: true
  });
}
