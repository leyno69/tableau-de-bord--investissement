import { MarketDataProvider } from './MarketDataProvider.js';

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertIsoDate(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${name} must be an ISO date (YYYY-MM-DD)`);
  }
  return normalized;
}

function parseFiniteNumber(value, name, { minimum = -Infinity } = {}) {
  if (value === '' || value === null || value === undefined) throw new TypeError(`${name} is required`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) throw new TypeError(`${name} must be a finite number >= ${minimum}`);
  return parsed;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (quoted) throw new TypeError('CSV contains an unterminated quoted field');
  cells.push(current.trim());
  return cells;
}

function parseCsv(text, delimiter) {
  const normalized = assertNonEmptyString(text, 'csvText').replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) throw new TypeError('CSV must include a header and at least one row');
  const headers = parseCsvLine(lines[0], delimiter);
  if (new Set(headers).size !== headers.length) throw new RangeError('CSV headers must be unique');
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line, delimiter);
    if (cells.length !== headers.length) throw new RangeError(`CSV row ${rowIndex + 2} has an invalid column count`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

export class CsvMarketDataProvider extends MarketDataProvider {
  #csvText;
  #delimiter;
  #metadata;

  constructor({ csvText, delimiter = ',', metadata }) {
    super({
      providerId: 'csv-local',
      capabilities: {
        prices: true,
        corporateActions: false,
        pointInTime: Boolean(metadata?.pointInTime),
        revisions: Boolean(metadata?.revisions),
        delistedEntities: Boolean(metadata?.delistedEntities),
      },
    });
    this.#csvText = assertNonEmptyString(csvText, 'csvText');
    this.#delimiter = assertNonEmptyString(delimiter, 'delimiter');
    if (this.#delimiter.length !== 1) throw new TypeError('delimiter must contain exactly one character');
    this.#metadata = deepFreeze({
      sourceId: assertNonEmptyString(metadata?.sourceId, 'metadata.sourceId'),
      licence: assertNonEmptyString(metadata?.licence, 'metadata.licence'),
      fingerprint: assertNonEmptyString(metadata?.fingerprint, 'metadata.fingerprint'),
      pointInTime: Boolean(metadata?.pointInTime),
      revisions: Boolean(metadata?.revisions),
      delistedEntities: Boolean(metadata?.delistedEntities),
    });
  }

  async fetchPrices({ symbols, startDate, endDate }) {
    if (!Array.isArray(symbols) || symbols.length === 0) throw new TypeError('symbols must be a non-empty array');
    const normalizedSymbols = new Set(symbols.map((symbol, index) => assertNonEmptyString(symbol, `symbols[${index}]`)));
    const start = assertIsoDate(startDate, 'startDate');
    const end = assertIsoDate(endDate, 'endDate');
    if (start > end) throw new RangeError('startDate must be before or equal to endDate');

    const records = parseCsv(this.#csvText, this.#delimiter).map((row, index) => {
      const date = assertIsoDate(row.date, `row[${index}].date`);
      return {
        symbol: assertNonEmptyString(row.symbol, `row[${index}].symbol`),
        date,
        open: parseFiniteNumber(row.open, `row[${index}].open`, { minimum: 0 }),
        high: parseFiniteNumber(row.high, `row[${index}].high`, { minimum: 0 }),
        low: parseFiniteNumber(row.low, `row[${index}].low`, { minimum: 0 }),
        close: parseFiniteNumber(row.close, `row[${index}].close`, { minimum: 0 }),
        volume: parseFiniteNumber(row.volume, `row[${index}].volume`, { minimum: 0 }),
        availableAt: assertIsoDate(row.availableAt, `row[${index}].availableAt`),
      };
    }).filter((record) => normalizedSymbols.has(record.symbol) && record.date >= start && record.date <= end);

    records.sort((left, right) => left.date.localeCompare(right.date) || left.symbol.localeCompare(right.symbol));
    return deepFreeze(records);
  }

  async fetchCorporateActions() {
    return deepFreeze([]);
  }

  async fetchMetadata() {
    return this.#metadata;
  }
}
