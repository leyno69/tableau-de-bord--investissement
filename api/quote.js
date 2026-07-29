export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '')
    .trim()
    .toUpperCase();

  if (!symbol) {
    return res.status(400).json({
      error: 'Le ticker est obligatoire.'
    });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Clé Twelve Data non configurée.'
    });
  }

  try {
    const url =
      'https://api.twelvedata.com/price' +
      `?symbol=${encodeURIComponent(symbol)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `apikey ${apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      return res.status(response.status || 400).json({
        error: data.message || 'Erreur Twelve Data.'
      });
    }

    const price = Number(data.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(404).json({
        error: 'Cours indisponible pour ce ticker.'
      });
    }

    return res.status(200).json({
      symbol,
      price
    });
  } catch (error) {
    console.error('Erreur Twelve Data :', error);

    return res.status(500).json({
      error: 'Impossible de récupérer le cours.'
    });
  }
}
