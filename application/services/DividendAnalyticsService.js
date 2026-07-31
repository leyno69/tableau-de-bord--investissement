import { Transaction } from '../../domain/transaction/Transaction.js';

/** Agrège les dividendes nets confirmés, sans dépendance à un courtier. */
export class DividendAnalyticsService {
  constructor({ transactionRepository, exchangeRateProvider }) {
    DividendAnalyticsService.#method(transactionRepository, 'listByPortfolio', 'transactionRepository');
    DividendAnalyticsService.#method(exchangeRateProvider, 'getRate', 'exchangeRateProvider');
    Object.assign(this, { transactionRepository, exchangeRateProvider });
  }

  async analyze({ portfolioId, from = null, to = null, baseCurrency = 'EUR' }) {
    const id = DividendAnalyticsService.#text(portfolioId, 'portfolioId');
    const start = from == null ? -Infinity : DividendAnalyticsService.#time(from, 'from', false);
    const end = to == null ? Infinity : DividendAnalyticsService.#time(to, 'to', true);
    if (start > end) throw new RangeError('from doit être antérieur ou égal à to.');
    const currency = DividendAnalyticsService.#currency(baseCurrency);
    const transactions = await this.transactionRepository.listByPortfolio(id);
    const rows = [];
    for (const transaction of transactions) {
      if (!(transaction instanceof Transaction)) throw new TypeError('Chaque opération doit être une instance de Transaction.');
      const time = DividendAnalyticsService.#executionTime(transaction.executedAt);
      if (!transaction.isConfirmed || !transaction.isReal || transaction.type !== Transaction.TYPES.DIVIDEND || time < start || time > end) continue;
      const gross = transaction.amount ?? transaction.grossAmount;
      const net = gross - transaction.fees - transaction.taxes;
      const rate = transaction.currency === currency ? 1 : await this.exchangeRateProvider.getRate(transaction.currency, currency);
      if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('Le taux de change doit être strictement positif.');
      rows.push(Object.freeze({
        transactionId: transaction.id,
        assetId: transaction.assetId,
        accountId: transaction.accountId,
        date: transaction.executedAt.slice(0, 10),
        sourceCurrency: transaction.currency,
        gross: DividendAnalyticsService.#round(gross * rate),
        fees: DividendAnalyticsService.#round(transaction.fees * rate),
        taxes: DividendAnalyticsService.#round(transaction.taxes * rate),
        net: DividendAnalyticsService.#round(net * rate)
      }));
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.transactionId.localeCompare(b.transactionId));
    const byAsset = DividendAnalyticsService.#group(rows, 'assetId');
    const byAccount = DividendAnalyticsService.#group(rows, 'accountId');
    const byMonth = DividendAnalyticsService.#group(rows.map(row => ({ ...row, month: row.date.slice(0, 7) })), 'month');
    return Object.freeze({
      portfolioId: id,
      baseCurrency: currency,
      from,
      to,
      count: rows.length,
      totalGross: DividendAnalyticsService.#round(rows.reduce((sum, row) => sum + row.gross, 0)),
      totalFees: DividendAnalyticsService.#round(rows.reduce((sum, row) => sum + row.fees, 0)),
      totalTaxes: DividendAnalyticsService.#round(rows.reduce((sum, row) => sum + row.taxes, 0)),
      totalNet: DividendAnalyticsService.#round(rows.reduce((sum, row) => sum + row.net, 0)),
      byAsset,
      byAccount,
      byMonth,
      transactions: Object.freeze(rows)
    });
  }

  static #group(rows, key) {
    const groups = new Map();
    for (const row of rows) groups.set(row[key], (groups.get(row[key]) ?? 0) + row.net);
    return Object.freeze([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, net]) => Object.freeze({ id, net: DividendAnalyticsService.#round(net) })));
  }
  static #executionTime(value) { return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value); }
  static #time(value, field, end) { const day = DividendAnalyticsService.#date(value, field); return Date.parse(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}Z`); }
  static #date(value, field) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new TypeError(`${field} doit être une date YYYY-MM-DD valide.`); return value; }
  static #currency(value) { const result = DividendAnalyticsService.#text(value, 'baseCurrency').toUpperCase(); if (!/^[A-Z]{3}$/.test(result)) throw new TypeError('baseCurrency doit être une devise ISO.'); return result; }
  static #text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
  static #method(value, method, field) { if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
  static #round(value) { return Number(Number(value).toFixed(10)); }
}
