import { Money } from '../../domain/money/Money.js';
import { Position } from '../../domain/position/Position.js';

/**
 * Calcule une performance comptable à partir d'une valorisation existante.
 *
 * Ce calcul n'est ni un TWR ni un MWR. Le taux simple utilise le coût restant
 * des positions comme dénominateur et demeure explicitement distinct des
 * futurs rendements tenant compte des dates et flux externes.
 */
export class CalculatePortfolioPerformance {
  constructor({ exchangeRateProvider }) {
    if (!exchangeRateProvider || typeof exchangeRateProvider.getRate !== 'function') {
      throw new TypeError('exchangeRateProvider doit implémenter getRate().');
    }

    this.exchangeRateProvider = exchangeRateProvider;
  }

  async execute(valuation) {
    CalculatePortfolioPerformance.#requireValuation(valuation);

    const baseCurrency = valuation.baseCurrency;
    const lines = [];
    let investedCapital = Money.zero(baseCurrency);
    let unrealizedGain = Money.zero(baseCurrency);
    let realizedGain = Money.zero(baseCurrency);
    let dividends = Money.zero(baseCurrency);

    for (const valuedPosition of valuation.positions) {
      const position = valuedPosition.position;

      if (!(position instanceof Position)) {
        throw new TypeError('Chaque ligne valorisée doit conserver sa Position source.');
      }

      CalculatePortfolioPerformance.#requireMoney(
        valuedPosition.convertedValue,
        'convertedValue'
      );

      const convertedCost = await this.#convert(
        new Money(position.totalCost, position.currency),
        baseCurrency
      );
      const convertedRealized = await this.#convert(
        new Money(position.realizedPnL, position.currency),
        baseCurrency
      );
      const convertedDividends = await this.#convert(
        new Money(position.dividends, position.currency),
        baseCurrency
      );
      const lineUnrealized = valuedPosition.convertedValue.subtract(convertedCost);
      const lineTotalGain = lineUnrealized
        .add(convertedRealized)
        .add(convertedDividends);

      investedCapital = investedCapital.add(convertedCost);
      unrealizedGain = unrealizedGain.add(lineUnrealized);
      realizedGain = realizedGain.add(convertedRealized);
      dividends = dividends.add(convertedDividends);

      lines.push(Object.freeze({
        position,
        assetId: position.assetId,
        marketValue: valuedPosition.convertedValue,
        investedCapital: convertedCost,
        unrealizedGain: lineUnrealized,
        realizedGain: convertedRealized,
        dividends: convertedDividends,
        totalGain: lineTotalGain,
        simpleReturnRate: CalculatePortfolioPerformance.#rate(
          lineTotalGain,
          convertedCost
        )
      }));
    }

    const totalGain = unrealizedGain.add(realizedGain).add(dividends);

    return Object.freeze({
      baseCurrency,
      lines: Object.freeze(lines),
      investedCapital,
      marketValue: valuation.positionsValue,
      unrealizedGain,
      realizedGain,
      dividends,
      totalGain,
      simpleReturnRate: CalculatePortfolioPerformance.#rate(
        totalGain,
        investedCapital
      )
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

  static #rate(gain, capital) {
    return capital.amount === 0
      ? null
      : Math.round((gain.amount / capital.amount) * 1e10) / 1e10;
  }

  static #requireValuation(valuation) {
    if (!valuation || typeof valuation !== 'object') {
      throw new TypeError('valuation doit être un objet.');
    }

    if (typeof valuation.baseCurrency !== 'string' || !/^[A-Z]{3}$/.test(valuation.baseCurrency)) {
      throw new TypeError('valuation.baseCurrency doit être une devise ISO normalisée.');
    }

    if (!Array.isArray(valuation.positions)) {
      throw new TypeError('valuation.positions doit être un tableau.');
    }

    CalculatePortfolioPerformance.#requireMoney(
      valuation.positionsValue,
      'valuation.positionsValue'
    );
  }

  static #requireMoney(value, label) {
    if (!(value instanceof Money)) {
      throw new TypeError(`${label} doit être une instance de Money.`);
    }
  }
}
