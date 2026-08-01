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

export function resolveMarketSymbol(item) {
  const explicit = String(item.marketSymbol || '').trim().toUpperCase();
  if (explicit) return explicit;
  const ticker = String(item.ticker || '').trim().toUpperCase();
  return LEGACY_MARKET_SYMBOLS.get(ticker) || ticker;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function fetchQuote(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) throw new Error('Symbole de marché manquant.');
  const response = await fetch(`/.netlify/functions/quote?symbol=${encodeURIComponent(normalized)}`);
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `Erreur marché (${response.status}).`);
  if (!Number.isFinite(Number(data.price))) throw new Error(`Cours invalide reçu pour ${normalized}.`);
  return {
    ...data,
    price: Number(data.price),
    change: data.change == null ? null : Number(data.change),
    percentChange: data.percentChange == null ? null : Number(data.percentChange)
  };
}

export async function fetchDailyHistory(symbol, { from, to } = {}) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) throw new Error('Symbole de marché manquant.');
  const params = new URLSearchParams({ symbol: normalized });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const response = await fetch(`/.netlify/functions/historical-eod?${params.toString()}`);
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || `Historique indisponible (${response.status}).`);
  if (!Array.isArray(data.rows)) throw new Error('Historique de marché invalide.');
  return {
    symbol: normalized,
    points: data.rows
      .map(row => ({ at: Date.parse(`${row.date}T12:00:00Z`), price: Number(row.adjustedClose ?? row.close) }))
      .filter(point => Number.isFinite(point.at) && Number.isFinite(point.price)),
    provenance: data.provenance || null,
    audit: data.audit || null
  };
}

export async function refreshMarketItems(items) {
  const results = await Promise.allSettled(items.map(async item => {
    const marketSymbol = resolveMarketSymbol(item);
    const quote = await fetchQuote(marketSymbol);
    return {
      ...item,
      marketSymbol,
      price: quote.price,
      change: Number.isFinite(quote.percentChange) ? quote.percentChange : item.change,
      marketUpdatedAt: quote.datetime || null,
      marketSource: quote.source || 'EODHD',
      marketError: null
    };
  }));
  return results.map((result, index) => result.status === 'fulfilled' ? result.value : {
    ...items[index],
    marketError: result.reason instanceof Error ? result.reason.message : 'Actualisation impossible.'
  });
}
