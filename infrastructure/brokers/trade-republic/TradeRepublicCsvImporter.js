import { createHash } from 'node:crypto';

export class TradeRepublicCsvImporter {
  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
    this.clock = clock;
  }

  import({ csv, portfolioId, accountId }) {
    const rows = parseCsv(csv);
    if (!rows.length) return Object.freeze([]);
    const headers = rows.shift().map(normalizeHeader);
    return Object.freeze(rows.filter(row => row.some(Boolean)).map((row, index) => {
      const record = Object.fromEntries(headers.map((header, column) => [header, row[column] ?? '']));
      const type = mapType(record.type || record.transaction || record.kind);
      const quantity = decimal(record.quantity || record.shares || record.numberofshares || 0);
      const unitPrice = decimal(record.price || record.shareprice || record.pricepershare || 0);
      const amount = decimal(record.amount || record.value || record.total || 0);
      const executedAt = isoDate(record.date || record.datetime || record.timestamp);
      const currency = String(record.currency || 'EUR').trim().toUpperCase();
      const externalId = String(record.id || record.transactionid || record.reference || '').trim() || fingerprint({ row, index, accountId });
      return Object.freeze({
        id: `trade-republic:${externalId}`,
        externalId,
        source: 'TRADE_REPUBLIC_CSV',
        portfolioId,
        accountId,
        assetId: nullable(record.isin || record.assetid || record.ticker),
        type,
        quantity,
        unitPrice,
        amount: standalone(type) ? Math.abs(amount || quantity * unitPrice) : undefined,
        fees: Math.abs(decimal(record.fees || record.fee || 0)),
        taxes: Math.abs(decimal(record.taxes || record.tax || 0)),
        currency,
        executedAt,
        createdAt: new Date(this.clock()).toISOString(),
        context: 'REAL',
        metadata: Object.freeze({ broker: 'trade-republic', rawType: record.type || record.transaction || '' })
      });
    }));
  }
}

function parseCsv(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('csv doit être une chaîne non vide.');
  const lines = value.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return lines.map(line => parseLine(line, delimiter));
}
function parseLine(line, delimiter) {
  const values = []; let current = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { values.push(current.trim()); current = ''; }
    else current += char;
  }
  values.push(current.trim());
  return values;
}
function normalizeHeader(value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function decimal(value) {
  if (value == null || value === '') return 0;
  const normalized = String(value).replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.').replace(/[^0-9+.-]/g, '');
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new TypeError(`Montant invalide : ${value}`);
  return number;
}
function isoDate(value) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) throw new TypeError(`Date Trade Republic invalide : ${value}`);
  return new Date(timestamp).toISOString();
}
function mapType(value) {
  const text = String(value || '').toLowerCase();
  if (/buy|achat|purchase/.test(text)) return 'buy';
  if (/sell|vente/.test(text)) return 'sell';
  if (/dividend|dividende|distribution/.test(text)) return 'dividend';
  if (/deposit|depot|dépôt|cash in/.test(text)) return 'deposit';
  if (/withdraw|retrait|cash out/.test(text)) return 'withdrawal';
  if (/tax|impot|impôt/.test(text)) return 'tax';
  if (/fee|frais/.test(text)) return 'fee';
  throw new RangeError(`Type Trade Republic non reconnu : ${value}`);
}
function standalone(type) { return ['dividend', 'deposit', 'withdrawal', 'fee', 'tax'].includes(type); }
function nullable(value) { const text = String(value || '').trim(); return text || null; }
function fingerprint(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24); }
