import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { CashLedger } from '../../domain/cash/CashLedger.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { ValuePortfolio } from '../use-cases/ValuePortfolio.js';

const DAY_MS = 86_400_000;
const DEFAULT_MAX_HISTORY_DAYS = 3660;

/** Reconstruit et valorise un portefeuille à une date civile donnée. */
export class PortfolioValuationService {
  constructor({ transactionRepository, preferencesRepository, marketDataProvider, exchangeRateProvider, portfolioLedger = PortfolioLedger, cashLedger = CashLedger, maxHistoryDays = DEFAULT_MAX_HISTORY_DAYS }) {
    PortfolioValuationService.#requireMethod(transactionRepository, 'listByPortfolio', 'transactionRepository');
    PortfolioValuationService.#requireMethod(preferencesRepository, 'findByPortfolio', 'preferencesRepository');
    PortfolioValuationService.#requireMethod(marketDataProvider, 'getHistory', 'marketDataProvider');
    PortfolioValuationService.#requireMethod(exchangeRateProvider, 'getRate', 'exchangeRateProvider');
    if (!portfolioLedger || typeof portfolioLedger.rebuildPositions !== 'function') throw new TypeError('portfolioLedger doit implémenter rebuildPositions().');
    if (!cashLedger || typeof cashLedger.rebuildMoneyBalances !== 'function') throw new TypeError('cashLedger doit implémenter rebuildMoneyBalances().');
    if (!Number.isInteger(maxHistoryDays) || maxHistoryDays <= 0) throw new RangeError('maxHistoryDays doit être un entier strictement positif.');
    Object.assign(this, { transactionRepository, preferencesRepository, marketDataProvider, exchangeRateProvider, portfolioLedger, cashLedger, maxHistoryDays });
  }

  async valueAt({ portfolioId, date, marketDataPolicy = 'strict' }) {
    const id = PortfolioValuationService.#text(portfolioId, 'portfolioId');
    const day = PortfolioValuationService.#date(date, 'date');
    const context = await this.#loadContext(id);
    return this.#valueWithContext({ context, day, marketDataPolicy });
  }

  async history({ portfolioId, from, to, marketDataPolicy = 'partial' }) {
    const id = PortfolioValuationService.#text(portfolioId, 'portfolioId');
    const start = PortfolioValuationService.#date(from, 'from');
    const end = PortfolioValuationService.#date(to, 'to');
    const startTime = Date.parse(`${start}T00:00:00.000Z`);
    const endTime = Date.parse(`${end}T00:00:00.000Z`);
    if (startTime > endTime) throw new RangeError('from doit être antérieur ou égal à to.');
    const dayCount = Math.floor((endTime - startTime) / DAY_MS) + 1;
    if (dayCount > this.maxHistoryDays) throw new RangeError(`La période ne peut pas dépasser ${this.maxHistoryDays} jours.`);
    this.#policy(marketDataPolicy);

    const context = await this.#loadContext(id);
    const assetIds = [...new Set(context.transactions.filter(item => item.assetId).map(item => item.assetId))];
    const histories = await Promise.all(assetIds.map(async assetId => [
      assetId,
      [...await this.marketDataProvider.getHistory(assetId, { to: `${end}T23:59:59.999Z` })]
        .sort((left, right) => Date.parse(left.quotedAt) - Date.parse(right.quotedAt))
    ]));
    context.quoteHistories = new Map(histories);

    const values = [];
    for (let cursor = startTime; cursor <= endTime; cursor += DAY_MS) {
      values.push(await this.#valueWithContext({ context, day: new Date(cursor).toISOString().slice(0, 10), marketDataPolicy }));
    }
    return Object.freeze(values);
  }

  async #loadContext(portfolioId) {
    const [allTransactions, preferences] = await Promise.all([
      this.transactionRepository.listByPortfolio(portfolioId),
      this.preferencesRepository.findByPortfolio(portfolioId)
    ]);
    if (preferences == null) throw new Error(`Aucune préférence n'est configurée pour le portefeuille "${portfolioId}".`);
    for (const transaction of allTransactions) if (!(transaction instanceof Transaction)) throw new TypeError('Chaque opération doit être une instance de Transaction.');
    return { portfolioId, transactions: [...allTransactions], preferences, quoteHistories: null };
  }

  async #valueWithContext({ context, day, marketDataPolicy }) {
    this.#policy(marketDataPolicy);
    const cutoff = Date.parse(`${day}T23:59:59.999Z`);
    const transactions = context.transactions.filter(transaction => transaction.isConfirmed && transaction.isReal && PortfolioValuationService.#executionTime(transaction.executedAt) <= cutoff);
    const positions = this.portfolioLedger.rebuildPositions(transactions);
    const cashBalances = this.cashLedger.rebuildMoneyBalances(transactions);
    const quoteMetadata = new Map();

    const datedProvider = {
      getPrice: async assetId => {
        const quotes = context.quoteHistories?.get(assetId)
          ?? [...await this.marketDataProvider.getHistory(assetId, { to: `${day}T23:59:59.999Z` })].sort((left, right) => Date.parse(left.quotedAt) - Date.parse(right.quotedAt));
        const quote = [...quotes].reverse().find(item => Date.parse(item.quotedAt) <= cutoff);
        if (quote == null) throw new RangeError(`Aucune cotation disponible pour ${assetId} au ${day}.`);
        quoteMetadata.set(assetId, Object.freeze({ quotedAt: quote.quotedAt, carriedForward: quote.quotedAt.slice(0, 10) !== day }));
        return quote.price;
      }
    };

    const valuation = await new ValuePortfolio({ marketPriceProvider: datedProvider, exchangeRateProvider: this.exchangeRateProvider }).execute({
      positions,
      cashBalances,
      baseCurrency: context.preferences.baseCurrency,
      marketDataPolicy
    });
    return Object.freeze({
      portfolioId: context.portfolioId,
      date: day,
      baseCurrency: valuation.baseCurrency,
      positions: valuation.positions,
      cash: valuation.cash,
      positionsValue: valuation.positionsValue,
      cashValue: valuation.cashValue,
      totalValue: valuation.totalValue,
      complete: valuation.complete,
      issues: valuation.issues,
      marketData: Object.freeze(Object.fromEntries([...quoteMetadata.entries()].sort(([left], [right]) => left.localeCompare(right))))
    });
  }

  #policy(value) { if (!['strict', 'partial'].includes(value)) throw new RangeError('marketDataPolicy doit valoir "strict" ou "partial".'); }
  static #executionTime(value) { const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value; const time = Date.parse(normalized); if (!Number.isFinite(time)) throw new TypeError('executedAt doit être une date valide.'); return time; }
  static #date(value, field) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} doit être une date civile au format YYYY-MM-DD.`); const parsed = new Date(`${value}T00:00:00.000Z`); if (parsed.toISOString().slice(0, 10) !== value) throw new TypeError(`${field} doit être une date civile valide.`); return value; }
  static #text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
  static #requireMethod(value, method, field) { if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
}
