import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';

/**
 * Valorise positions et espèces dans la devise de référence du portefeuille.
 *
 * La comptabilité reste indépendante : ce cas d'usage consomme des positions
 * et soldes déjà reconstruits, puis interroge explicitement les fournisseurs
 * de prix et de taux de change.
 */
export class ValuePortfolio {
  constructor({ marketPriceProvider, exchangeRateProvider }) {
    ValuePortfolio.#requireMethod(marketPriceProvider, 'getPrice', 'marketPriceProvider');
    ValuePortfolio.#requireMethod(exchangeRateProvider, 'getRate', 'exchangeRateProvider');

    this.marketPriceProvider = marketPriceProvider;
    this.exchangeRateProvider = exchangeRateProvider;
  }

  async execute({ positions, cashBalances, baseCurrency }) {
    ValuePortfolio.#requireArray(positions, 'positions');
    ValuePortfolio.#requireArray(cashBalances, 'cashBalances');
    const normalizedBaseCurrency = ValuePortfolio.#requireCurrency(baseCurrency);

    const valuedPositions = [];
    let positionsValue = Money.zero(normalizedBaseCurrency);

    for (const position of positions) {
      if (!(position instanceof Position)) {
        throw new TypeError('Chaque position doit être une instance de Position.');
      }

      if (!position.hasPosition) {
        continue;
      }

      const marketPrice = await this.marketPriceProvider.getPrice(position.assetId);
      ValuePortfolio.#requireMoney(marketPrice, `Le prix de ${position.assetId}`);

      const nativeValue = marketPrice.multiply(position.quantity);
      const convertedValue = await this.#convert(nativeValue, normalizedBaseCurrency);

      positionsValue = positionsValue.add(convertedValue);
      valuedPositions.push(Object.freeze({
        position,
        assetId: position.assetId,
        quantity: position.quantity,
        marketPrice,
        nativeValue,
        convertedValue
      }));
    }

    const valuedCash = [];
    let cashValue = Money.zero(normalizedBaseCurrency);

    for (const entry of cashBalances) {
      if (!entry || typeof entry !== 'object') {
        throw new TypeError('Chaque solde espèces doit être un objet.');
      }

      ValuePortfolio.#requireMoney(entry.balance, 'balance');
      const convertedValue = await this.#convert(entry.balance, normalizedBaseCurrency);

      cashValue = cashValue.add(convertedValue);
      valuedCash.push(Object.freeze({
        portfolioId: entry.portfolioId,
        accountId: entry.accountId,
        balance: entry.balance,
        convertedValue
      }));
    }

    return Object.freeze({
      baseCurrency: normalizedBaseCurrency,
      positions: Object.freeze(valuedPositions),
      cash: Object.freeze(valuedCash),
      positionsValue,
      cashValue,
      totalValue: positionsValue.add(cashValue)
    });
  }

  async #convert(money, targetCurrency) {
    if (money.currency === targetCurrency) {
      return money;
    }

    const rate = Number(
      await this.exchangeRateProvider.getRate(money.currency, targetCurrency)
    );

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new RangeError(
        `Le taux ${money.currency}/${targetCurrency} doit être strictement positif.`
      );
    }

    return new Money(money.amount * rate, targetCurrency);
  }

  static #requireMethod(provider, methodName, providerName) {
    if (!provider || typeof provider[methodName] !== 'function') {
      throw new TypeError(`${providerName} doit implémenter ${methodName}().`);
    }
  }

  static #requireArray(value, fieldName) {
    if (!Array.isArray(value)) {
      throw new TypeError(`${fieldName} doit être un tableau.`);
    }
  }

  static #requireCurrency(value) {
    if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) {
      throw new TypeError('baseCurrency doit être un code ISO composé de trois lettres.');
    }

    return value.trim().toUpperCase();
  }

  static #requireMoney(value, label) {
    if (!(value instanceof Money)) {
      throw new TypeError(`${label} doit être une instance de Money.`);
    }
  }
}
