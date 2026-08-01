const UNIVERSE = Object.freeze({
  NVDA: 'NVIDIA', MSFT: 'Microsoft', AAPL: 'Apple', AMZN: 'Amazon',
  GOOGL: 'Alphabet', META: 'Meta', TSLA: 'Tesla', AMD: 'AMD',
  SPY: 'S&P 500 ETF', BTCUSD: 'Bitcoin / dollar'
});

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!UNIVERSE[symbol]) return res.status(400).json({ error: 'Actif absent de l’univers pilote.', allowed: Object.keys(UNIVERSE) });
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Clé Twelve Data non configurée.' });

  try {
    const headers = { Authorization: `apikey ${apiKey}` };
    const timeSeriesUrl = new URL('https://api.twelvedata.com/time_series');
    timeSeriesUrl.searchParams.set('symbol', symbol === 'BTCUSD' ? 'BTC/USD' : symbol);
    timeSeriesUrl.searchParams.set('interval', '5min');
    timeSeriesUrl.searchParams.set('outputsize', '30');
    timeSeriesUrl.searchParams.set('timezone', 'UTC');
    const quoteUrl = new URL('https://api.twelvedata.com/quote');
    quoteUrl.searchParams.set('symbol', symbol === 'BTCUSD' ? 'BTC/USD' : symbol);

    const [seriesResponse, quoteResponse] = await Promise.all([
      fetch(timeSeriesUrl, { headers }), fetch(quoteUrl, { headers })
    ]);
    const [series, quote] = await Promise.all([seriesResponse.json(), quoteResponse.json()]);
    const upstreamError = [series, quote].find(payload => payload?.status === 'error' || payload?.code);
    if (!seriesResponse.ok || !quoteResponse.ok || upstreamError) {
      const code = Number(upstreamError?.code || 502);
      return res.status(code === 429 ? 429 : 502).json({ error: upstreamError?.message || 'Données intrajournalières indisponibles.' });
    }

    const bars = Array.isArray(series.values) ? series.values.map(normalizeBar).filter(Boolean).reverse() : [];
    if (bars.length < 6) return res.status(422).json({ error: 'Historique intrajournalier insuffisant.' });
    const latest = bars.at(-1);
    const previous = bars.at(-2);
    const volumes = bars.slice(0, -1).map(bar => bar.volume).filter(Number.isFinite);
    const averageVolume = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;
    const returns = bars.slice(1).map((bar, index) => (bar.close / bars[index].close - 1) * 100).filter(Number.isFinite);
    const volatilityPct = standardDeviation(returns);
    const bid = positiveNumber(quote.bid);
    const ask = positiveNumber(quote.ask);
    const mid = bid && ask ? (bid + ask) / 2 : null;
    const spreadPct = mid ? ((ask - bid) / mid) * 100 : null;
    const price = positiveNumber(quote.close) || latest.close;
    const dollarVolume = latest.volume * price;
    const liquidityScore = Number.isFinite(spreadPct)
      ? Math.round(Math.max(0, Math.min(100, 55 + Math.log10(Math.max(1, dollarVolume)) * 6 - spreadPct * 30)))
      : null;

    return res.status(200).json({
      symbol, name: UNIVERSE[symbol], source: 'Twelve Data', interval: '5min',
      price, timestamp: latest.timestamp, volume: latest.volume, averageVolume,
      spreadPct, volatilityPct, liquidityScore,
      momentumPct: ((latest.close / previous.close) - 1) * 100,
      bars, limitations: spreadPct == null ? ['Bid/ask absent de la réponse fournisseur : signal bloqué.'] : []
    });
  } catch (error) {
    console.error('Twelve Data intraday error:', error);
    return res.status(500).json({ error: 'Impossible de calculer les données intrajournalières.' });
  }
}

function normalizeBar(value) {
  const close = positiveNumber(value?.close);
  const volume = Number(value?.volume);
  const timestamp = value?.datetime ? new Date(`${value.datetime.replace(' ', 'T')}Z`).toISOString() : null;
  return close && Number.isFinite(volume) && timestamp ? { timestamp, open: Number(value.open), high: Number(value.high), low: Number(value.low), close, volume } : null;
}
function positiveNumber(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function standardDeviation(values) {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export { UNIVERSE };
