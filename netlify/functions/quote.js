export default async (request) => {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    return Response.json(
     { error: "Clé API EODHD absente côté serveur." },
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
  `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}` +
  `?api_token=${encodeURIComponent(apiKey)}` +
  `&fmt=json&order=d`
);

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      return Response.json(
        {
          error: data.message || "Erreur EODHD.",
          code: data.code || response.status,
        },
        { status: response.ok ? 400 : response.status }
      );
    }

    const rows = Array.isArray(data) ? data : [];
const latest = rows[0];
const previous = rows[1] || null;

if (!latest) {
  return Response.json(
    { error: "Aucune donnée disponible pour ce symbole." },
    { status: 404 }
  );
}

const price = Number(latest.close);
const previousClose = previous ? Number(previous.close) : null;

const change =
  Number.isFinite(previousClose)
    ? price - previousClose
    : null;

const percentChange =
  Number.isFinite(previousClose) && previousClose !== 0
    ? (change / previousClose) * 100
    : null;

return Response.json({
  symbol,
  price,
  previousClose,
  change,
  percentChange,
  open: Number(latest.open),
  high: Number(latest.high),
  low: Number(latest.low),
  volume: Number(latest.volume),
  datetime: latest.date,
  source: "EODHD"
});
  } catch (error) {
    console.error("EODHD error:", error);

    return Response.json(
      { error: "Impossible de récupérer les données de marché." },
      { status: 502 }
    );
  }
};
