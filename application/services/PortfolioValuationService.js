import { PortfolioLedger } from '../../domain/portfolio/PortfolioLedger.js';
import { CashLedger } from '../../domain/cash/CashLedger.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { ValuePortfolio } from '../use-cases/ValuePortfolio.js';

/**
 * Reconstruit et valorise un portefeuille à une date civile donnée.
 *
 * Les jours sans cotation utilisent exclusivement la dernière cotation connue
 * antérieure ou égale à la date demandée. Aucun prix n'est interpolé.
 */
export class PortfolioValuationService {
  constructor({ transactionRepository, preferencesRepository, marketDataProvider, exchangeRateProvider, portfolioLedger = PortfolioLedger, cashLedger = CashLedger }) {
    PortfolioValuationService.#requireMethod(transactionRepository, 'listByPortfolio', 'transactionRepository');
    PortfolioValuationService.#requireMethod(preferencesRepository, 'findByPortfolio', 'preferencesRepository');
    PortfolioValuationService.#requireMethod(marketDataProvider, 'getHistory', 'marketDataProvider');
    PortfolioValuationService.#requireMethod(exchangeRateProvider, 'getRate', 'exchangeRateProvider');
    if (!portfolioLedger || typeof portfolioLedger.rebuildPositions !== 'function') throw new TypeError('portfolioLedger doit implémenter rebuildPositions().');
    if (!cashLedger || typeof cashLedger.rebuildMoneyBalances !== 'function') throw new TypeError('cashLedger doit implémenter rebuildMoneyBalances().');
    Object.assign(this, { transactionRepository, preferencesRepository, marketDataProvider, exchangeRateProvider, portfolioLedger, cashLedger });
  }

  async valueAt({ portfolioId, date, marketDataPolicy = 'strict' }) {
    const id = PortfolioValuationService.#text(portfolioId, 'portfolioId');
    const day = PortfolioValuationService.#date(date, 'date');
    if (!['strict', 'partial'].includes(marketDataPolicy)) throw new RangeError('marketDataPolicy doit valoir "strict" ou "partial".');

    const [allTransactions, preferences] = await Promise.all([
      this.transactionRepository.listByPortfolio(id),
      this.preferencesRepository.findByPortfolio(id)
    ]);
    if (preferences == null) throw new Error(`Aucune préférence n'est configurée pour le portefeuille "${id}".`);

    const cutoff = Date.parse(`${day}T23:59:59.999Z`);
    const transactions = allTransactions.filter(transaction => {
      if (!(transaction instanceof Transaction)) throw new TypeError('Chaque opération doit être une instance de Transaction.');
      return transaction.isConfirmed && transaction.isReal && PortfolioValuationService.#executionTime(transaction.executedAt) <= cutoff;
    });
    const positions = this.portfolioLedger.rebuildPositions(transactions);
    const cashBalances = this.cashLedger.rebuildMoneyBalances(transactions);
    const quoteMetadata = new Map();

    const datedProvider = {
      getPrice: async assetId => {
        const quotes = await this.marketDataProvider.getHistory(assetId, { to: `${day}T23:59:59.999Z` });
        const quote = [...quotes].sort((left, right) => Date.parse(left.quotedAt) - Date.parse(right.quotedAt)).at(-1);
        if (quote == null) throw new RangeError(`Aucune cotation disponible pour ${assetId} au ${day}.`);
        quoteMetadata.set(assetId, Object.freeze({ quotedAt: quote.quotedAt, carriedForward: quote.quotedAt.slice(0, 10) !== day }));
        return quote.price;
      }
    };

    const valuation = await new ValuePortfolio({ marketPriceProvider: datedProvider, exchangeRateProvider: this.exchangeRateProvider }).execute({
      positions,
      cashBalances,
      baseCurrency: preferences.baseCurrency,
      marketDataPolicy
    });

    return Object.freeze({
      portfolioId: id,
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

  async history({ portfolioId, from, to, marketDataPolicy = 'partial' }) {
    const start = PortfolioValuationService.#date(from, 'from');
    const end = PortfolioValuationService.#date(to, 'to');
    if (start > end) throw new RangeError('from doit être antérieur ou égal à to.');
    const values = [];
    for (let cursor = Date.parse(`${start}T00:00:00.000Z`), limit = Date.parse(`${end}T00:00:00.000Z`); cursor <= limit; cursor += 86_400_000) {
      values.push(await this.valueAt({ portfolioId, date: new Date(cursor).toISOString().slice(0, 10), marketDataPolicy }));
    }
    return Object.freeze(values);
  }

  static #executionTime(value) {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
    const time = Date.parse(normalized);
    if (!Number.isFinite(time)) throw new TypeError('executedAt doit être une date valide.');
    return time;
  }

  static #date(value, field) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} doit être une date civile au format YYYY-MM-DD.`);
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (parsed.toISOString().slice(0, 10) !== value) throw new TypeError(`${field} doit être une date civile valide.`);
    return value;
  }

  static #text(value, field) {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }

  static #requireMethod(value, method, field) {
    if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`);
  }
}
