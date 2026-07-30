export default async (request) => {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'Clé API EODHD absente côté serveur.' },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-:]{1,30}$/.test(symbol)) {
    return Response.json(
      { error: 'Symbole invalide.' },
      { status: 400 }
    );
  }

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 14);
  const fromDate = from.toISOString().slice(0, 10);

  try {
    const endpoint = new URL(`https://eodhd.com/api/eod/${encodeURIComponent(symbol)}`);
    endpoint.searchParams.set('api_token', apiKey);
    endpoint.searchParams.set('fmt', 'json');
    endpoint.searchParams.set('order', 'd');
    endpoint.searchParams.set('period', 'd');
    endpoint.searchParams.set('from', fromDate);

    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return Response.json(
        {
          error: data?.message || `Erreur EODHD (${response.status}).`,
          code: data?.code || response.status
        },
        { status: response.status }
      );
    }

    if (data?.status === 'error') {
      return Response.json(
        {
          error: data.message || 'Erreur EODHD.',
          code: data.code || 400
        },
        { status: 400 }
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const latest = rows[0];
    const previous = rows[1] || null;

    if (!latest) {
      return Response.json(
        { error: `Aucune donnée EODHD disponible pour ${symbol}.` },
        { status: 404 }
      );
    }

    const price = Number(latest.close);
    const previousClose = previous ? Number(previous.close) : null;

    if (!Number.isFinite(price)) {
      return Response.json(
        { error: `Cours EODHD invalide pour ${symbol}.` },
        { status: 502 }
      );
    }

    const hasPreviousClose = Number.isFinite(previousClose) && previousClose !== 0;
    const change = hasPreviousClose ? price - previousClose : null;
    const percentChange = hasPreviousClose ? (change / previousClose) * 100 : null;

    return Response.json({
      symbol,
      price,
      previousClose: hasPreviousClose ? previousClose : null,
      change,
      percentChange,
      open: Number.isFinite(Number(latest.open)) ? Number(latest.open) : null,
      high: Number.isFinite(Number(latest.high)) ? Number(latest.high) : null,
      low: Number.isFinite(Number(latest.low)) ? Number(latest.low) : null,
      volume: Number.isFinite(Number(latest.volume)) ? Number(latest.volume) : null,
      datetime: latest.date || null,
      source: 'EODHD'
    });
  } catch (error) {
    console.error('EODHD error:', error);

    return Response.json(
      { error: 'Impossible de récupérer les données de marché.' },
      { status: 502 }
    );
  }
};
