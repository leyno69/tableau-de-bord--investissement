const RANGE_CONFIG = Object.freeze({
  '1H': { seconds: 60 * 60, resolution: '5' },
  '1J': { seconds: 24 * 60 * 60, resolution: '15' },
  '5J': { seconds: 5 * 24 * 60 * 60, resolution: '60' },
  '1S': { seconds: 7 * 24 * 60 * 60, resolution: '60' },
  '1M': { seconds: 31 * 24 * 60 * 60, resolution: 'D' },
  '6M': { seconds: 183 * 24 * 60 * 60, resolution: 'D' },
  '1A': { seconds: 366 * 24 * 60 * 60, resolution: 'D' },
  MAX: { seconds: 10 * 366 * 24 * 60 * 60, resolution: 'W' }
});

function normalizeFinnhubSymbol(input) {
  const symbol = String(input || '').trim().toUpperCase();
  if (/^[A-Z0-9.-]+\.US$/.test(symbol)) return symbol.slice(0, -3);
  return symbol;
}

export default async function handler(req, res) {
  const requestedSymbol = String(req.query.symbol || '').trim().toUpperCase();
  const range = String(req.query.range || '1M').trim().toUpperCase();
  if (!requestedSymbol) return res.status(400).json({ error: 'Le ticker est obligatoire.' });
  if (!RANGE_CONFIG[range]) return res.status(400).json({ error: 'Période graphique invalide.' });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé Finnhub non configurée.' });

  const symbol = normalizeFinnhubSymbol(requestedSymbol);
  const config = RANGE_CONFIG[range];
  const to = Math.floor(Date.now() / 1000);
  const from = Math.max(0, to - config.seconds);

  try {
    const url = new URL('https://finnhub.io/api/v1/stock/candle');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('resolution', config.resolution);
    url.searchParams.set('from', String(from));
    url.searchParams.set('to', String(to));
    url.searchParams.set('token', apiKey);
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) return res.status(response.status).json({ error: data.error || 'Erreur Finnhub.' });
    if (data.s !== 'ok' || !Array.isArray(data.t) || !Array.isArray(data.c)) {
      return res.status(404).json({ error: 'Historique indisponible pour ce ticker ou cette période.' });
    }

    const points = data.t.map((timestamp, index) => ({
      at: Number(timestamp) * 1000,
      price: Number(data.c[index]),
      open: Number(data.o?.[index]),
      high: Number(data.h?.[index]),
      low: Number(data.l?.[index]),
      volume: Number(data.v?.[index])
    })).filter(point => Number.isFinite(point.at) && Number.isFinite(point.price));

    return res.status(200).json({
      symbol: requestedSymbol,
      providerSymbol: symbol,
      range,
      resolution: config.resolution,
      source: 'Finnhub',
      points
    });
  } catch (error) {
    console.error('Erreur historique Finnhub :', error);
    return res.status(500).json({ error: 'Impossible de récupérer l’historique.' });
  }
}
