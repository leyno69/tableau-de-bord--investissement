function normalizeFinnhubSymbol(input) {
  const symbol = String(input || '').trim().toUpperCase();
  if (/^[A-Z0-9.-]+\.US$/.test(symbol)) return symbol.slice(0, -3);
  return symbol;
}

export default async function handler(req, res) {
  const requestedSymbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!requestedSymbol) return res.status(400).json({ error: 'Le ticker est obligatoire.' });

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;

  try {
    if (finnhubKey) {
      const symbol = normalizeFinnhubSymbol(requestedSymbol);
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(finnhubKey)}`;
      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      const price = Number(data.c);
      if (!response.ok) return res.status(response.status).json({ error: data.error || 'Erreur Finnhub.' });
      if (!Number.isFinite(price) || price <= 0) return res.status(404).json({ error: 'Cours indisponible pour ce ticker.' });
      return res.status(200).json({
        symbol: requestedSymbol,
        providerSymbol: symbol,
        price,
        change: Number.isFinite(Number(data.d)) ? Number(data.d) : null,
        percentChange: Number.isFinite(Number(data.dp)) ? Number(data.dp) : null,
        open: Number.isFinite(Number(data.o)) ? Number(data.o) : null,
        high: Number.isFinite(Number(data.h)) ? Number(data.h) : null,
        low: Number.isFinite(Number(data.l)) ? Number(data.l) : null,
        previousClose: Number.isFinite(Number(data.pc)) ? Number(data.pc) : null,
        datetime: Number.isFinite(Number(data.t)) && Number(data.t) > 0 ? new Date(Number(data.t) * 1000).toISOString() : new Date().toISOString(),
        source: 'Finnhub'
      });
    }

    if (twelveDataKey) {
      const response = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(requestedSymbol)}`, {
        headers: { Authorization: `apikey ${twelveDataKey}`, accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status === 'error') return res.status(response.status || 400).json({ error: data.message || 'Erreur Twelve Data.' });
      const price = Number(data.close);
      if (!Number.isFinite(price) || price <= 0) return res.status(404).json({ error: 'Cours indisponible pour ce ticker.' });
      return res.status(200).json({
        symbol: requestedSymbol,
        price,
        change: Number.isFinite(Number(data.change)) ? Number(data.change) : null,
        percentChange: Number.isFinite(Number(data.percent_change)) ? Number(data.percent_change) : null,
        datetime: data.datetime || new Date().toISOString(),
        source: 'Twelve Data'
      });
    }

    return res.status(500).json({ error: 'Aucune clé de fournisseur de marché n’est configurée.' });
  } catch (error) {
    console.error('Erreur fournisseur marché :', error);
    return res.status(500).json({ error: 'Impossible de récupérer le cours.' });
  }
}
