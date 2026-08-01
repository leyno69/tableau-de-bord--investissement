const FIELD_ALIASES = {
  date: ['date', 'datetime', 'time', 'executed at', 'transaction date', 'datum'],
  name: ['name', 'asset', 'instrument', 'security', 'product', 'nom', 'actif'],
  ticker: ['ticker', 'symbol', 'symbole'],
  isin: ['isin'],
  type: ['type', 'asset type', 'instrument type'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'quantite', 'quantité'],
  avgPrice: ['avg price', 'average price', 'price', 'execution price', 'pru', 'prix'],
  amount: ['amount', 'total', 'value', 'montant'],
  currency: ['currency', 'devise'],
  operation: ['operation', 'side', 'action', 'transaction type', 'type operation'],
  fees: ['fees', 'fee', 'commission', 'frais'],
  cash: ['cash', 'cash balance', 'liquidites', 'liquidités', 'solde espèces']
};

export function parseDelimited(text) {
  const source = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!source) return { headers: [], rows: [] };
  const firstLine = source.split(/\r?\n/, 1)[0];
  const delimiter = detectDelimiter(firstLine);
  const matrix = parseRows(source, delimiter);
  const headers = (matrix.shift() || []).map(value => normalizeHeader(value));
  const rows = matrix.filter(row => row.some(value => String(value).trim() !== '')).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  return { headers, rows, delimiter };
}

export function normalizeBrokerRows(rows, { broker = 'trade-republic', fileName = '' } = {}) {
  return rows.map((row, index) => normalizeRow(row, { broker, fileName, index })).filter(Boolean);
}

export function normalizeRow(row, { broker = 'trade-republic', fileName = '', index = 0 } = {}) {
  const mapped = mapAliases(row);
  const quantity = number(mapped.quantity);
  const avgPrice = number(mapped.avgPrice);
  const amount = number(mapped.amount);
  const cash = number(mapped.cash);
  const operation = normalizeOperation(mapped.operation);
  const name = clean(mapped.name) || clean(mapped.ticker) || clean(mapped.isin) || `Ligne ${index + 1}`;
  const ticker = clean(mapped.ticker).toUpperCase();
  const isin = clean(mapped.isin).toUpperCase();
  const date = normalizeDate(mapped.date);
  const currency = clean(mapped.currency || 'EUR').toUpperCase();
  const type = clean(mapped.type || inferType(name));
  const fees = Math.abs(number(mapped.fees) || 0);
  const id = fingerprint({ broker, date, operation, ticker, isin, quantity, avgPrice, amount, cash, currency, name });
  return {
    id,
    source: { broker, fileName, row: index + 2 },
    date,
    operation,
    name,
    ticker,
    isin,
    type,
    quantity,
    avgPrice,
    amount,
    cash,
    fees,
    currency,
    status: validateNormalized({ operation, quantity, avgPrice, amount, cash, ticker, isin, name })
  };
}

export function detectDuplicates(importedRows, existingFingerprints = []) {
  const seen = new Set(existingFingerprints);
  return importedRows.map(row => {
    const duplicate = seen.has(row.id);
    seen.add(row.id);
    return { ...row, duplicate };
  });
}

export function buildPortfolioPatch(rows, portfolio = { cash: 0, positions: [] }) {
  const positions = new Map((portfolio.positions || []).map(position => [positionKey(position), { ...position }]));
  let cash = Number(portfolio.cash || 0);
  const applied = [];
  const skipped = [];

  for (const row of rows) {
    if (row.duplicate || row.status.level === 'error') {
      skipped.push(row);
      continue;
    }
    if (row.operation === 'cash' && Number.isFinite(row.cash)) {
      cash = row.cash;
      applied.push(row);
      continue;
    }
    if (!['buy', 'sell'].includes(row.operation)) {
      skipped.push(row);
      continue;
    }
    const key = positionKey(row);
    const current = positions.get(key) || {
      id: Date.now() + applied.length,
      name: row.name,
      ticker: row.ticker || row.isin || row.name.slice(0, 8).toUpperCase(),
      isin: row.isin || undefined,
      type: row.type || 'Action',
      broker: row.source.broker,
      quantity: 0,
      avgPrice: 0,
      price: row.avgPrice || 0,
      region: 'Autre'
    };
    if (row.operation === 'buy') {
      const oldCost = Number(current.quantity || 0) * Number(current.avgPrice || 0);
      const addedCost = Number(row.quantity || 0) * Number(row.avgPrice || 0) + Number(row.fees || 0);
      const nextQuantity = Number(current.quantity || 0) + Number(row.quantity || 0);
      current.avgPrice = nextQuantity > 0 ? (oldCost + addedCost) / nextQuantity : 0;
      current.quantity = nextQuantity;
      current.price = row.avgPrice || current.price;
    } else {
      current.quantity = Math.max(0, Number(current.quantity || 0) - Number(row.quantity || 0));
      current.price = row.avgPrice || current.price;
    }
    positions.set(key, current);
    applied.push(row);
  }

  return {
    portfolio: { ...portfolio, cash, positions: [...positions.values()].filter(position => Number(position.quantity) > 0) },
    applied,
    skipped
  };
}

export function fingerprint(value) {
  const canonical = JSON.stringify(sortObject(value));
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `imp_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function detectDelimiter(line) {
  const candidates = [',', ';', '\t'];
  return candidates.sort((a, b) => count(line, b) - count(line, a))[0];
}

function parseRows(source, delimiter) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (quoted && next === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += char;
  }
  row.push(value); rows.push(row);
  return rows;
}

function mapAliases(row) {
  const output = {};
  for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
    const key = Object.keys(row).find(header => aliases.includes(normalizeHeader(header)));
    output[target] = key ? row[key] : '';
  }
  return output;
}

function validateNormalized(value) {
  const warnings = [];
  if (!value.name) warnings.push('Nom absent');
  if (!value.ticker && !value.isin && value.operation !== 'cash') warnings.push('Ticker ou ISIN absent');
  if (['buy', 'sell'].includes(value.operation) && !(value.quantity > 0)) warnings.push('Quantité invalide');
  if (['buy', 'sell'].includes(value.operation) && !(value.avgPrice >= 0)) warnings.push('Prix invalide');
  if (value.operation === 'unknown') warnings.push('Type d’opération non reconnu');
  if (value.operation === 'cash' && !Number.isFinite(value.cash)) warnings.push('Solde de liquidités absent');
  return { level: warnings.length ? 'error' : 'ok', messages: warnings };
}

function normalizeOperation(value) {
  const text = clean(value).toLowerCase();
  if (/buy|achat|acquisition|savings plan/.test(text)) return 'buy';
  if (/sell|vente|cession/.test(text)) return 'sell';
  if (/cash|solde|balance/.test(text)) return 'cash';
  if (/deposit|dépôt|depot|withdrawal|retrait|dividend|dividende|interest|intérêt/.test(text)) return 'cashflow';
  return 'unknown';
}

function normalizeDate(value) {
  const text = clean(value);
  if (!text) return '';
  const french = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (french) {
    const year = french[3].length === 2 ? `20${french[3]}` : french[3];
    return `${year}-${french[2].padStart(2, '0')}-${french[1].padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function inferType(name) {
  return /ETF|MSCI|S&P|STOXX|NASDAQ|INDEX/i.test(name) ? 'ETF' : 'Action';
}

function positionKey(value) {
  return String(value.isin || value.ticker || value.name).trim().toUpperCase();
}

function normalizeHeader(value) { return clean(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function clean(value) { return String(value ?? '').trim(); }
function number(value) {
  if (value === '' || value == null) return NaN;
  const normalized = String(value).replace(/\s/g, '').replace(/[^0-9,.-]/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}
function count(text, token) { return text.split(token).length - 1; }
function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObject(value[key])]));
}
