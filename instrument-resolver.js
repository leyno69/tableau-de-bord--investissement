export async function searchInstruments(query) {
  const response = await fetch(`/.netlify/functions/resolve-instrument?q=${encodeURIComponent(query)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Recherche impossible (${response.status}).`);
  }

  return Array.isArray(data.candidates) ? data.candidates : [];
}

export async function verifyMarketSymbol(marketSymbol) {
  const response = await fetch(`/.netlify/functions/quote?symbol=${encodeURIComponent(marketSymbol)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Symbole marché indisponible (${response.status}).`);
  }

  return data;
}

export function instrumentType(type) {
  return /ETF|FUND/i.test(type || '') ? 'ETF' : 'Action';
}

export function regionFromCandidate(candidate) {
  const country = String(candidate.country || '').toLowerCase();
  if (/united states|usa|états-unis/.test(country)) return 'États-Unis';
  if (/france|germany|italy|spain|netherlands|belgium|austria|portugal|ireland|finland|sweden|denmark|norway|switzerland|united kingdom/.test(country)) return 'Europe';
  if (/china|taiwan|south korea|hong kong|singapore|india|indonesia|malaysia|thailand|philippines/.test(country)) return 'Asie émergente';
  return 'Autre';
}
