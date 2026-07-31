import { createHash } from 'node:crypto';
import { Transaction } from '../../domain/transaction/Transaction.js';

export class NormalizeBrokerTransactions {
  execute({ records, existingTransactions = [] }) {
    if (!Array.isArray(records)) throw new TypeError('records doit être un tableau.');
    if (!Array.isArray(existingTransactions)) throw new TypeError('existingTransactions doit être un tableau.');

    const known = new Set(existingTransactions.map(item => identity(item)));
    const accepted = [];
    const duplicates = [];
    const rejected = [];

    records.forEach((record, index) => {
      try {
        const normalized = normalize(record);
        const transaction = new Transaction(normalized);
        const key = identity(record, transaction);
        if (known.has(key)) {
          duplicates.push(Object.freeze({ index, id: transaction.id, identity: key }));
          return;
        }
        known.add(key);
        accepted.push(Object.freeze({ transaction, source: record.source ?? 'UNKNOWN', externalId: record.externalId ?? null, metadata: freeze(record.metadata ?? {}) }));
      } catch (error) {
        rejected.push(Object.freeze({ index, code: error?.code ?? 'INVALID_BROKER_RECORD', message: error instanceof Error ? error.message : 'Enregistrement invalide.' }));
      }
    });

    return Object.freeze({
      accepted: Object.freeze(accepted), duplicates: Object.freeze(duplicates), rejected: Object.freeze(rejected),
      complete: rejected.length === 0, importedCount: accepted.length, duplicateCount: duplicates.length, rejectedCount: rejected.length
    });
  }
}

function normalize(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Chaque record doit être un objet.');
  const type = String(record.type || '').toLowerCase();
  const standalone = ['dividend', 'deposit', 'withdrawal', 'fee', 'tax'].includes(type);
  return {
    id: text(record.id, 'id'), portfolioId: text(record.portfolioId, 'portfolioId'), accountId: text(record.accountId, 'accountId'),
    assetId: record.assetId == null || String(record.assetId).trim() === '' ? null : String(record.assetId).trim().toUpperCase(),
    type, context: record.context ?? 'REAL',
    quantity: positiveOrZero(record.quantity), unitPrice: positiveOrZero(record.unitPrice),
    ...(standalone ? { amount: Math.abs(number(record.amount, 'amount')) } : {}),
    fees: Math.abs(number(record.fees ?? 0, 'fees')), taxes: Math.abs(number(record.taxes ?? 0, 'taxes')),
    currency: text(record.currency ?? 'EUR', 'currency').toUpperCase(), executedAt: iso(record.executedAt, 'executedAt'),
    status: record.status ?? 'confirmed', createdAt: iso(record.createdAt ?? new Date().toISOString(), 'createdAt')
  };
}

function identity(record, transaction = record) {
  const external = record?.externalId == null ? '' : String(record.externalId).trim();
  const source = record?.source == null ? '' : String(record.source).trim();
  if (external && source) return `external:${source}:${external}`;
  if (transaction?.id) return `id:${transaction.id}`;
  const payload = {
    portfolioId: transaction.portfolioId, accountId: transaction.accountId, assetId: transaction.assetId ?? null,
    type: transaction.type, quantity: Number(transaction.quantity ?? 0), unitPrice: Number(transaction.unitPrice ?? 0),
    amount: transaction.amount ?? null, currency: transaction.currency, executedAt: transaction.executedAt
  };
  return `fingerprint:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}
function text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
function number(value, field) { const result = Number(value); if (!Number.isFinite(result)) throw new TypeError(`${field} doit être un nombre.`); return result; }
function positiveOrZero(value) { const result = number(value ?? 0, 'valeur'); if (result < 0) throw new RangeError('La valeur doit être positive ou nulle.'); return result; }
function iso(value, field) { const timestamp = Date.parse(value); if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date valide.`); return new Date(timestamp).toISOString(); }
function freeze(value) { return Object.freeze(structuredClone(value)); }
