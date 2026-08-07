function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

function isoDate(value, field) {
  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new TypeError(`${field} doit être YYYY-MM-DD.`);
  return text;
}

function finitePositive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} doit être > 0.`);
  return number;
}

export function parseLicensedBenchmarkCsv(csv, manifest) {
  if (typeof csv !== 'string' || csv.trim() === '') throw new TypeError('csv requis.');
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new TypeError('manifest requis.');
  const provider = requiredText(manifest.provider, 'manifest.provider');
  const licenseReference = requiredText(manifest.licenseReference, 'manifest.licenseReference');
  const indexCode = requiredText(manifest.indexCode, 'manifest.indexCode');
  const returnVariant = requiredText(manifest.returnVariant, 'manifest.returnVariant');
  const currency = requiredText(manifest.currency, 'manifest.currency').toUpperCase();
  if (manifest.validationEligible !== true) throw new TypeError('manifest.validationEligible doit être true pour une importation de validation.');

  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift().split(',').map(item => item.trim());
  if (header.length !== 2 || header[0] !== 'date' || header[1] !== 'level') throw new TypeError('en-tête CSV attendu: date,level');
  const seen = new Set();
  const series = lines.map((line, index) => {
    const cells = line.split(',').map(item => item.trim());
    if (cells.length !== 2) throw new TypeError(`ligne ${index + 2}: deux colonnes requises.`);
    const date = isoDate(cells[0], `ligne ${index + 2}.date`);
    if (seen.has(date)) throw new TypeError(`date dupliquée: ${date}`);
    seen.add(date);
    return Object.freeze({ date, availableAt: date, price: finitePositive(cells[1], `ligne ${index + 2}.level`) });
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (series.length < 2) throw new TypeError('au moins deux observations requises.');

  return Object.freeze({
    schemaVersion: 1,
    provider,
    licenseReference,
    indexCode,
    returnVariant,
    currency,
    series: Object.freeze(series)
  });
}
