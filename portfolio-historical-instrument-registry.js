export const historicalInstrumentRegistryV1 = Object.freeze([
  Object.freeze({
    sourceTicker: 'WPEA',
    status: 'identified',
    identity: 'iShares MSCI World Swap PEA UCITS ETF',
    issuer: 'BlackRock / iShares',
    isin: 'IE0002XZSHO1',
    inceptionDate: '2024-03-26',
    sourceType: 'official-issuer',
    sourceReference: 'blackrock-fr-products-335178',
    note: 'Exact instrument history cannot predate 2024-03-26.',
  }),
  Object.freeze({
    sourceTicker: 'PAEJ',
    status: 'identified',
    identity: 'Amundi PEA Asie Pacifique (MSCI AC Asia Pacific Ex Japan) UCITS ETF Acc',
    issuer: 'Amundi Asset Management',
    isin: 'FR0011869312',
    inceptionDate: '2014-05-13',
    sourceType: 'official-issuer',
    sourceReference: 'amundi-monthly-factsheet-FR0011869312',
    note: 'Exact instrument history cannot predate 2014-05-13.',
  }),
  Object.freeze({
    sourceTicker: 'NVDA',
    status: 'identified',
    identity: 'NVIDIA Corporation common stock',
    issuer: 'NVIDIA Corporation',
    isin: null,
    inceptionDate: '1999-01-22',
    sourceType: 'official-issuer',
    sourceReference: 'nvidia-investor-faq-ipo',
    note: 'The date recorded here is the IPO date, not the company incorporation date.',
  }),
  Object.freeze({
    sourceTicker: 'SMH',
    status: 'ambiguous',
    identity: null,
    issuer: 'VanEck',
    isin: null,
    inceptionDate: null,
    sourceType: 'official-issuer',
    sourceReference: 'vaneck-smh-us-and-eu-products',
    candidates: Object.freeze([
      Object.freeze({ identity: 'VanEck Semiconductor ETF (US)', inceptionDate: '2011-12-20' }),
      Object.freeze({ identity: 'VanEck Semiconductor UCITS ETF (Europe)', inceptionDate: '2020-12-01', isin: 'IE00BMC38736' }),
    ]),
    note: 'Ticker alone is insufficient: the US and European products must not be conflated.',
  }),
]);

export function findHistoricalInstrumentRegistryEntry(ticker) {
  const normalized = String(ticker ?? '').trim().toUpperCase();
  return historicalInstrumentRegistryV1.find(entry => entry.sourceTicker === normalized) ?? null;
}

export function auditInstrumentRegistryForPresetTickers(tickers) {
  if (!Array.isArray(tickers)) throw new TypeError('tickers doit être un tableau.');
  const entries = tickers.map(ticker => {
    const normalized = String(ticker ?? '').trim().toUpperCase();
    const entry = findHistoricalInstrumentRegistryEntry(normalized);
    if (!entry) return Object.freeze({ ticker: normalized, status: 'missing', blocker: 'instrument-not-registered' });
    if (entry.status === 'ambiguous') return Object.freeze({ ticker: normalized, status: 'blocked', blocker: 'instrument-identity-ambiguous' });
    return Object.freeze({ ticker: normalized, status: 'identified', blocker: null, inceptionDate: entry.inceptionDate });
  });
  return Object.freeze({
    entries: Object.freeze(entries),
    ready: entries.every(entry => entry.status === 'identified'),
  });
}
