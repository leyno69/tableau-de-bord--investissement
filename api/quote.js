export default async function handler(req, res) {
    const symbol = String(req.query.symbol || "").trim().toUpperCase();

    if (!symbol) {
        return res.status(400).json({
            error: "Le ticker est obligatoire."
        });
    }

    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Clé Finnhub non configurée."
        });
    }

    try {
        const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`
);

        if (!response.ok) {
    const errorText = await response.text();

    return res.status(response.status).json({
        error: "Erreur Finnhub",
        status: response.status,
        details: errorText
    });
}

        const data = await response.json();

        return res.status(200).json({
            symbol,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            previousClose: data.pc
        });
    } catch (error) {
        return res.status(500).json({
            error: "Impossible de contacter Finnhub."
        });
    }
}
