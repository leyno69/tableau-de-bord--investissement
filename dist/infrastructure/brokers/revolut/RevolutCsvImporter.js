import { createHash } from 'node:crypto';

export class RevolutCsvImporter {
  constructor({ clock = () => new Date() } = {}) { if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.'); this.clock = clock; }

  import({ csv, portfolioId, accountId }) {
    const rows = parseCsv(csv);
    const headers = rows.shift().map(header);
    return Object.freeze(rows.filter(row => row.some(Boolean)).map((row, index) => {
      const record = Object.fromEntries(headers.map((name, column) => [name, row[column] ?? '']));
      const type = mapType(record.type || record.transactiontype || record.description);
      const quantity = number(record.quantity || record.shares || 0);
      const amount = number(record.amount || record.totalamount || record.value || 0);
      const unitPrice = number(record.pricepershare || record.price || (quantity ? Math.abs(amount / quantity) : 0));
      const executedAt = date(record.datecompleted || record.date || record.datetime);
      const externalId = String(record.id || record.transactionid || '').trim() || hash({ row, index, accountId });
      const symbol = String(record.ticker || record.symbol || record.isin || '').trim();
      return Object.freeze({
        id: `revolut:${externalId}`, externalId, source: 'REVOLUT_CSV', portfolioId, accountId,
        assetId: symbol || null, type, quantity: Math.abs(quantity), unitPrice: Math.abs(unitPrice),
        amount: standalone(type) ? Math.abs(amount) : undefined,
        fees: Math.abs(number(record.fee || record.fees || 0)), taxes: Math.abs(number(record.tax || record.taxes || 0)),
        currency: String(record.currency || 'EUR').trim().toUpperCase(), executedAt,
        createdAt: new Date(this.clock()).toISOString(), context: 'REAL',
        metadata: Object.freeze({ broker: 'revolut', rawType: record.type || record.transactiontype || '' })
      });
    }));
  }
}

function parseCsv(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('csv doit être une chaîne non vide.');
  const lines = value.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => parseLine(line, ','));
}
function parseLine(line, delimiter) {
  const out = []; let current = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { out.push(current.trim()); current = ''; }
    else current += char;
  }
  out.push(current.trim()); return out;
}
function header(value) { return String(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function number(value) {
  if (value == null || value === '') return 0;
  const parsed = Number(String(value).replace(/\s/g, '').replace(/,/g, '').replace(/[^0-9+.-]/g, ''));
  if (!Number.isFinite(parsed)) throw new TypeError(`Nombre Revolut invalide : ${value}`);
  return parsed;
}
function date(value) { const timestamp = Date.parse(String(value || '')); if (!Number.isFinite(timestamp)) throw new TypeError(`Date Revolut invalide : ${value}`); return new Date(timestamp).toISOString(); }
function mapType(value) {
  const text = String(value || '').toLowerCase();
  if (/buy|market buy|limit buy/.test(text)) return 'buy';
  if (/sell|market sell|limit sell/.test(text)) return 'sell';
  if (/dividend/.test(text)) return 'dividend';
  if (/cash deposit|deposit|card to investment/.test(text)) return 'deposit';
  if (/withdraw|cash withdrawal/.test(text)) return 'withdrawal';
  if (/fee|commission/.test(text)) return 'fee';
  if (/tax/.test(text)) return 'tax';
  throw new RangeError(`Type Revolut non reconnu : ${value}`);
}
function standalone(type) { return ['dividend', 'deposit', 'withdrawal', 'fee', 'tax'].includes(type); }
function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24); }
