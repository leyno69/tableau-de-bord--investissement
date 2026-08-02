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

const PUBLIC_ERRORS = Object.freeze({
  unavailable: 'Données historiques temporairement indisponibles.',
  rateLimited: 'Le fournisseur de marché est temporairement saturé. Réessayez plus tard.',
  notFound: 'Aucun historique vérifiable n’est disponible pour ce ticker et cette période.'
});

function normalizeFinnhubSymbol(input) {
  const symbol = String(input || '').trim().toUpperCase();
  if (/^[A-Z0-9.-]+\.US$/.test(symbol)) return symbol.slice(0, -3);
  return symbol;
}

function upstreamStatus(status) {
  if (status === 429) return 503;
  return status >= 400 && status < 500 ? 502 : 503;
}

export default async function handler(req, res) {
  const requestedSymbol = String(req.query.symbol || '').trim().toUpperCase();
  const range = String(req.query.range || '1M').trim().toUpperCase();
  if (!requestedSymbol) return res.status(400).json({ error: 'Le ticker est obligatoire.' });
  if (!RANGE_CONFIG[range]) return res.status(400).json({ error: 'Période graphique invalide.' });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error('Historique marché indisponible : FINNHUB_API_KEY absente.');
    return res.status(503).json({ error: PUBLIC_ERRORS.unavailable, code: 'MARKET_HISTORY_UNAVAILABLE' });
  }

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

    if (!response.ok) {
      console.error('Erreur fournisseur historique :', { status: response.status, symbol, range, providerError: data.error || null });
      const rateLimited = response.status === 429;
      return res.status(upstreamStatus(response.status)).json({
        error: rateLimited ? PUBLIC_ERRORS.rateLimited : PUBLIC_ERRORS.unavailable,
        code: rateLimited ? 'MARKET_PROVIDER_RATE_LIMITED' : 'MARKET_PROVIDER_ERROR'
      });
    }
    if (data.s !== 'ok' || !Array.isArray(data.t) || !Array.isArray(data.c)) {
      return res.status(404).json({ error: PUBLIC_ERRORS.notFound, code: 'MARKET_HISTORY_NOT_FOUND' });
    }

    const points = data.t.map((timestamp, index) => ({
      at: Number(timestamp) * 1000,
      price: Number(data.c[index]),
      open: Number(data.o?.[index]),
      high: Number(data.h?.[index]),
      low: Number(data.l?.[index]),
      volume: Number(data.v?.[index])
    })).filter(point => Number.isFinite(point.at) && Number.isFinite(point.price));

    if (points.length < 2) {
      return res.status(404).json({ error: PUBLIC_ERRORS.notFound, code: 'MARKET_HISTORY_INSUFFICIENT' });
    }

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
    return res.status(503).json({ error: PUBLIC_ERRORS.unavailable, code: 'MARKET_HISTORY_UNAVAILABLE' });
  }
}

export { PUBLIC_ERRORS, normalizeFinnhubSymbol, upstreamStatus };
