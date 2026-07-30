export default async (request) => {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Clé API EODHD absente côté serveur.' }, { status: 500 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const requestedType = (url.searchParams.get('type') || 'all').trim().toLowerCase();
  const allowedTypes = new Set(['all', 'stock', 'etf', 'fund', 'bond', 'index', 'crypto']);

  if (query.length < 2 || query.length > 120) {
    return Response.json({ error: 'Recherche invalide.' }, { status: 400 });
  }

  if (!allowedTypes.has(requestedType)) {
    return Response.json({ error: 'Type d’instrument invalide.' }, { status: 400 });
  }

  async function eodSearch(type) {
    const typeParam = type && type !== 'all' ? `&type=${encodeURIComponent(type)}` : '';
    const response = await fetch(
      `https://eodhd.com/api/search/${encodeURIComponent(query)}` +
      `?api_token=${encodeURIComponent(apiKey)}&fmt=json&limit=30${typeParam}`
    );
    const data = await response.json();
    if (!response.ok || !Array.isArray(data)) {
      throw new Error(data?.message || `Recherche EODHD indisponible (${response.status}).`);
    }
    return data;
  }

  try {
    // EODHD exclut les obligations d'une recherche "all". Pour une recherche
    // utilisateur globale, on fusionne donc la recherche standard et les bonds.
    const batches = requestedType === 'all'
      ? await Promise.all([eodSearch('all'), eodSearch('bond')])
      : [await eodSearch(requestedType)];

    const data = batches.flat();
    const normalizedQuery = query.toUpperCase();
    const normalizedNameQuery = query.toLocaleLowerCase('fr-FR');
    const seen = new Set();

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
        const normalizedName = name.toLocaleLowerCase('fr-FR');

        let score = 0;
        if (isin && isin === normalizedQuery) score += 120;
        if (code && code === normalizedQuery) score += 100;
        if (normalizedName === normalizedNameQuery) score += 90;
        else if (normalizedName.startsWith(normalizedNameQuery)) score += 55;
        else if (normalizedName.includes(normalizedNameQuery)) score += 35;
        if (isPrimary) score += 20;

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
      .filter((item) => {
        const key = `${item.marketSymbol}|${item.isin || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score || Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, 'fr'))
      .slice(0, 20);

    return Response.json({ query, requestedType, candidates, source: 'EODHD' });
  } catch (error) {
    console.error('EODHD instrument resolver error:', error);
    return Response.json({ error: error.message || 'Impossible de rechercher cet instrument.' }, { status: 502 });
  }
};
