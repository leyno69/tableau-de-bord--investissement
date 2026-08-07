export const defaultWatchlist = [
  { id: 1, name: 'NVIDIA', ticker: 'NVDA', marketSymbol: 'NVDA.US', price: 146.8, change: 1.92, signal: 'Surveiller', note: 'Semi-conducteurs / IA' },
  { id: 2, name: 'TSMC', ticker: 'TSM', marketSymbol: 'TSM.US', price: 191.3, change: -0.64, signal: 'Surveiller', note: 'Exposition Taïwan' },
  { id: 3, name: 'Schneider Electric', ticker: 'SU', marketSymbol: 'SU.PA', price: 229.5, change: 0.73, signal: 'Achat', note: 'Électrification / data centers' }
];

const LEGACY_MARKET_SYMBOLS = new Map([
  ['NVDA', 'NVDA.US'],
  ['TSM', 'TSM.US'],
  ['SU', 'SU.PA']
]);

const QUOTE_ENDPOINTS = Object.freeze(['/api/quote', '/.netlify/functions/quote']);

export function resolveMarketSymbol(item) {
  const explicit = String(item.marketSymbol || '').trim().toUpperCase();
  if (explicit) return explicit;

  const ticker = String(item.ticker || '').trim().toUpperCase();
  return LEGACY_MARKET_SYMBOLS.get(ticker) || ticker;
}

async function requestQuote(endpoint, normalized) {
  const response = await fetch(`${endpoint}?symbol=${encodeURIComponent(normalized)}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function fetchQuote(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();

  if (!normalized) throw new Error('Symbole de marché manquant.');

  let lastFailure = null;
  for (const endpoint of QUOTE_ENDPOINTS) {
    try {
      const { response, data } = await requestQuote(endpoint, normalized);
      if (!response.ok) {
        lastFailure = new Error(data.error || `Cours indisponible (${response.status}).`);
        if (response.status === 404) continue;
        throw lastFailure;
      }
      if (!Number.isFinite(Number(data.price))) throw new Error(`Cours invalide reçu pour ${normalized}.`);
      return {
        ...data,
        price: Number(data.price),
        change: data.change == null ? null : Number(data.change),
        percentChange: data.percentChange == null ? null : Number(data.percentChange)
      };
    } catch (error) {
      lastFailure = error instanceof Error ? error : new Error('Actualisation impossible.');
    }
  }

  throw lastFailure || new Error('Cours indisponible.');
}

export async function refreshMarketItems(items) {
  const results = await Promise.allSettled(
    items.map(async item => {
      const marketSymbol = resolveMarketSymbol(item);
      const quote = await fetchQuote(marketSymbol);

      return {
        ...item,
        marketSymbol,
        price: quote.price,
        change: Number.isFinite(quote.percentChange) ? quote.percentChange : item.change,
        marketUpdatedAt: quote.datetime || new Date().toISOString(),
        marketSource: quote.source || 'Finnhub',
        marketError: null
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;

    return {
      ...items[index],
      marketError: result.reason instanceof Error ? result.reason.message : 'Actualisation impossible.'
    };
  });
}
