import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';

/**
 * Valorise positions et espèces dans la devise de référence du portefeuille.
 *
 * En mode partiel, une position dont le prix ou la conversion est indisponible
 * est exclue du total et décrite dans valuation.issues. Le total est alors un
 * minimum connu, jamais une estimation silencieuse.
 */
export class ValuePortfolio {
  constructor({ marketPriceProvider, exchangeRateProvider }) {
    ValuePortfolio.#requireMethod(marketPriceProvider, 'getPrice', 'marketPriceProvider');
    ValuePortfolio.#requireMethod(exchangeRateProvider, 'getRate', 'exchangeRateProvider');
    this.marketPriceProvider = marketPriceProvider;
    this.exchangeRateProvider = exchangeRateProvider;
  }

  async execute({ positions, cashBalances, baseCurrency, marketDataPolicy = 'strict' }) {
    ValuePortfolio.#requireArray(positions, 'positions');
    ValuePortfolio.#requireArray(cashBalances, 'cashBalances');
    const normalizedBaseCurrency = ValuePortfolio.#requireCurrency(baseCurrency);
    if (!['strict', 'partial'].includes(marketDataPolicy)) {
      throw new RangeError('marketDataPolicy doit valoir "strict" ou "partial".');
    }

    const openPositions = positions.filter(position => {
      if (!(position instanceof Position)) throw new TypeError('Chaque position doit être une instance de Position.');
      return position.hasPosition;
    });
    const settledPositions = await Promise.allSettled(openPositions.map(position => this.#valuePosition(position, normalizedBaseCurrency)));
    const valuedPositions = [];
    const issues = [];
    let positionsValue = Money.zero(normalizedBaseCurrency);

    settledPositions.forEach((result, index) => {
      const position = openPositions[index];
      if (result.status === 'fulfilled') {
        valuedPositions.push(result.value);
        positionsValue = positionsValue.add(result.value.convertedValue);
        return;
      }
      if (marketDataPolicy === 'strict') throw result.reason;
      issues.push(ValuePortfolio.#issue(position.assetId, result.reason));
    });

    const valuedCash = [];
    let cashValue = Money.zero(normalizedBaseCurrency);
    for (const entry of cashBalances) {
      if (!entry || typeof entry !== 'object') throw new TypeError('Chaque solde espèces doit être un objet.');
      ValuePortfolio.#requireMoney(entry.balance, 'balance');
      const convertedValue = await this.#convert(entry.balance, normalizedBaseCurrency);
      cashValue = cashValue.add(convertedValue);
      valuedCash.push(Object.freeze({ portfolioId: entry.portfolioId, accountId: entry.accountId, balance: entry.balance, convertedValue }));
    }

    return Object.freeze({
      baseCurrency: normalizedBaseCurrency,
      positions: Object.freeze(valuedPositions),
      cash: Object.freeze(valuedCash),
      positionsValue,
      cashValue,
      totalValue: positionsValue.add(cashValue),
      issues: Object.freeze(issues),
      complete: issues.length === 0,
      valuedPositionCount: valuedPositions.length,
      requestedPositionCount: openPositions.length
    });
  }

  async #valuePosition(position, baseCurrency) {
    const marketPrice = await this.marketPriceProvider.getPrice(position.assetId);
    ValuePortfolio.#requireMoney(marketPrice, `Le prix de ${position.assetId}`);
    const nativeValue = marketPrice.multiply(position.quantity);
    const convertedValue = await this.#convert(nativeValue, baseCurrency);
    return Object.freeze({ position, assetId: position.assetId, quantity: position.quantity, marketPrice, nativeValue, convertedValue });
  }

  async #convert(money, targetCurrency) {
    if (money.currency === targetCurrency) return money;
    const rate = Number(await this.exchangeRateProvider.getRate(money.currency, targetCurrency));
    if (!Number.isFinite(rate) || rate <= 0) throw new RangeError(`Le taux ${money.currency}/${targetCurrency} doit être strictement positif.`);
    return new Money(money.amount * rate, targetCurrency);
  }

  static #issue(assetId, error) {
    return Object.freeze({
      assetId,
      stage: 'VALUATION',
      code: typeof error?.code === 'string' ? error.code : 'PRICE_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Prix indisponible.'
    });
  }

  static #requireMethod(provider, methodName, providerName) {
    if (!provider || typeof provider[methodName] !== 'function') throw new TypeError(`${providerName} doit implémenter ${methodName}().`);
  }
  static #requireArray(value, fieldName) { if (!Array.isArray(value)) throw new TypeError(`${fieldName} doit être un tableau.`); }
  static #requireCurrency(value) {
    if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) throw new TypeError('baseCurrency doit être un code ISO composé de trois lettres.');
    return value.trim().toUpperCase();
  }
  static #requireMoney(value, label) { if (!(value instanceof Money)) throw new TypeError(`${label} doit être une instance de Money.`); }
}
