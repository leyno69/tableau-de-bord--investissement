export const eodhdInstrumentCoverageEvidenceV1 = Object.freeze([
  Object.freeze({ sourceTicker: 'WPEA', providerSymbol: 'WPEA.PA', verified: true, source: 'https://eodhd.com/financial-summary/WPEA.PA' }),
  Object.freeze({ sourceTicker: 'PAEJ', providerSymbol: 'PAEJ.PA', verified: true, source: 'https://eodhd.com/financial-summary/PAEJ.PA' }),
  Object.freeze({ sourceTicker: 'NVDA', providerSymbol: 'NVDA.US', verified: true, source: 'https://eodhd.com/financial-summary/NVDA.US' }),
  Object.freeze({ sourceTicker: 'SMH-US', providerSymbol: 'SMH.US', verified: true, source: 'https://eodhd.com/financial-summary/SMH.US' }),
  Object.freeze({ sourceTicker: 'SMH-EU', providerSymbol: 'SMH.PA', verified: true, source: 'https://eodhd.com/financial-summary/SMH.PA' })
]);

export function findEodhdCoverageEvidence(sourceTicker) {
  const normalized = String(sourceTicker ?? '').trim().toUpperCase();
  return eodhdInstrumentCoverageEvidenceV1.find(item => item.sourceTicker === normalized) ?? null;
}
