export default async (request) => {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Clé API EODHD absente côté serveur.' }, { status: 500 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();

  if (query.length < 2 || query.length > 120) {
    return Response.json({ error: 'Recherche invalide.' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://eodhd.com/api/search/${encodeURIComponent(query)}` +
      `?api_token=${encodeURIComponent(apiKey)}&fmt=json&limit=20`
    );

    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      return Response.json(
        { error: data?.message || 'Recherche EODHD indisponible.' },
        { status: response.ok ? 502 : response.status }
      );
    }

    const normalizedQuery = query.toUpperCase();
    const candidates = data
      .map((item) => {
        const code = String(item.Code || item.code || '').trim().toUpperCase();
        const exchange = String(item.Exchange || item.exchange || '').trim().toUpperCase();
        const isin = String(item.ISIN || item.Isin || item.isin || '').trim().toUpperCase();
        const name = String(item.Name || item.name || '').trim();
        const type = String(item.Type || item.type || '').trim();
        const currency = String(item.Currency || item.currency || '').trim().toUpperCase();
        const country = String(item.Country || item.country || '').trim();
        const isPrimary = Boolean(item.isPrimary ?? item.IsPrimary ?? false);
        const marketSymbol = code && exchange ? `${code}.${exchange}` : code;

        let score = 0;
        if (isin && isin === normalizedQuery) score += 100;
        if (code && code === normalizedQuery) score += 80;
        if (isPrimary) score += 20;
        if (/ETF|FUND/i.test(type)) score += 5;

        return {
          code,
          exchange,
          marketSymbol,
          name,
          type,
          country,
          currency,
          isin: isin || null,
          isPrimary,
          previousClose: Number(item.previousClose ?? item.PreviousClose) || null,
          previousCloseDate: item.previousCloseDate || item.PreviousCloseDate || null,
          score
        };
      })
      .filter((item) => item.code && item.exchange)
      .sort((a, b) => b.score - a.score || Number(b.isPrimary) - Number(a.isPrimary))
      .slice(0, 12);

    return Response.json({ query, candidates, source: 'EODHD' });
  } catch (error) {
    console.error('EODHD instrument resolver error:', error);
    return Response.json({ error: 'Impossible de rechercher cet instrument.' }, { status: 502 });
  }
};
