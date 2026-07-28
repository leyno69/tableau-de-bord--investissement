export default async (request) => {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Clé API Twelve Data absente côté serveur." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-:]{1,20}$/.test(symbol)) {
    return Response.json(
      { error: "Symbole invalide." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}`,
      {
        headers: {
          Authorization: `apikey ${apiKey}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      return Response.json(
        {
          error: data.message || "Erreur Twelve Data.",
          code: data.code || response.status,
        },
        { status: response.ok ? 400 : response.status }
      );
    }

    return Response.json({
      symbol: data.symbol,
      name: data.name,
      exchange: data.exchange,
      currency: data.currency,
      price: Number(data.close),
      previousClose: Number(data.previous_close),
      change: Number(data.change),
      percentChange: Number(data.percent_change),
      open: Number(data.open),
      high: Number(data.high),
      low: Number(data.low),
      volume: Number(data.volume),
      datetime: data.datetime,
      isMarketOpen: data.is_market_open,
    });
  } catch (error) {
    console.error("Twelve Data error:", error);

    return Response.json(
      { error: "Impossible de récupérer les données de marché." },
      { status: 502 }
    );
  }
};
