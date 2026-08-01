const SYMBOLS = Object.freeze(['SPY','MSFT','AAPL','GOOGL','AMZN','META','NVDA','AMD','TSLA','BINANCE:BTCUSDT']);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'FINNHUB_API_KEY non configurée.' });

  const snapshots = [];
  for (const symbol of SYMBOLS) {
    try {
      const endpoint = new URL('https://finnhub.io/api/v1/quote');
      endpoint.searchParams.set('symbol', symbol);
      endpoint.searchParams.set('token', apiKey);
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      const price = Number(payload.c);
      if (!response.ok || !Number.isFinite(price) || price <= 0) {
        snapshots.push({ symbol: normalizeSymbol(symbol), status: 'unavailable' });
        continue;
      }
      const previousClose = Number(payload.pc);
      const open = Number(payload.o);
      const high = Number(payload.h);
      const low = Number(payload.l);
      snapshots.push({
        symbol: normalizeSymbol(symbol),
        status: 'ok',
        price,
        previousClose: Number.isFinite(previousClose) ? previousClose : null,
        open: Number.isFinite(open) ? open : null,
        high: Number.isFinite(high) ? high : null,
        low: Number.isFinite(low) ? low : null,
        changePct: Number.isFinite(previousClose) && previousClose > 0 ? ((price / previousClose) - 1) * 100 : null,
        rangePct: Number.isFinite(high) && Number.isFinite(low) && price > 0 ? ((high - low) / price) * 100 : null,
        timestamp: Number.isFinite(Number(payload.t)) ? new Date(Number(payload.t) * 1000).toISOString() : new Date().toISOString(),
        source: 'FINNHUB'
      });
    } catch {
      snapshots.push({ symbol: normalizeSymbol(symbol), status: 'unavailable' });
    }
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ generatedAt: new Date().toISOString(), snapshots });
}

function normalizeSymbol(symbol) {
  return symbol === 'BINANCE:BTCUSDT' ? 'BTCUSD' : symbol;
}
