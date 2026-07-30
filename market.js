export const defaultWatchlist = [
  { id: 1, name: 'NVIDIA', ticker: 'NVDA', marketSymbol: 'NVDA.US', price: 146.8, change: 1.92, signal: 'Surveiller', note: 'Semi-conducteurs / IA' },
  { id: 2, name: 'TSMC', ticker: 'TSM', marketSymbol: 'TSM.US', price: 191.3, change: -0.64, signal: 'Surveiller', note: 'Exposition Taïwan' },
  { id: 3, name: 'Schneider Electric', ticker: 'SU', marketSymbol: 'SU.PA', price: 229.5, change: 0.73, signal: 'Achat', note: 'Électrification / data centers' }
];

export async function fetchQuote(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();

  if (!normalized) {
    throw new Error('Symbole de marché manquant.');
  }

  const response = await fetch(`/.netlify/functions/quote?symbol=${encodeURIComponent(normalized)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erreur marché (${response.status}).`);
  }

  if (!Number.isFinite(Number(data.price))) {
    throw new Error(`Cours invalide reçu pour ${normalized}.`);
  }

  return {
    ...data,
    price: Number(data.price),
    change: data.change == null ? null : Number(data.change),
    percentChange: data.percentChange == null ? null : Number(data.percentChange)
  };
}

export async function refreshMarketItems(items) {
  const results = await Promise.allSettled(
    items.map(async item => {
      const marketSymbol = item.marketSymbol || item.ticker;
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
