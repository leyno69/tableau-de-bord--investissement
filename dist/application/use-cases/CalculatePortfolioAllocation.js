import { Money } from '../../domain/money/Money.js';

const UNKNOWN = 'UNKNOWN';
const CASH = 'CASH';

/**
 * Calcule les poids du portefeuille à partir d'une valorisation déjà consolidée.
 */
export class CalculatePortfolioAllocation {
  constructor({ assetClassificationProvider }) {
    if (!assetClassificationProvider || typeof assetClassificationProvider.getClassification !== 'function') {
      throw new TypeError('assetClassificationProvider doit implémenter getClassification().');
    }

    this.assetClassificationProvider = assetClassificationProvider;
  }

  async execute(valuation) {
    CalculatePortfolioAllocation.#requireValuation(valuation);

    const total = valuation.totalValue;
    const holdings = [];
    const dimensions = {
      assetClasses: new Map(),
      sectors: new Map(),
      countries: new Map(),
      currencies: new Map()
    };

    for (const entry of valuation.positions) {
      CalculatePortfolioAllocation.#requireMoney(entry.convertedValue, 'convertedValue');
      CalculatePortfolioAllocation.#requireMoney(entry.nativeValue, 'nativeValue');

      const classification = await this.assetClassificationProvider.getClassification(entry.assetId);
      const normalized = CalculatePortfolioAllocation.#normalizeClassification(classification);
      const weight = CalculatePortfolioAllocation.#weight(entry.convertedValue, total);

      holdings.push(Object.freeze({
        kind: 'POSITION',
        assetId: entry.assetId,
        value: entry.convertedValue,
        nativeCurrency: entry.nativeValue.currency,
        weight,
        ...normalized
      }));

      CalculatePortfolioAllocation.#accumulate(dimensions.assetClasses, normalized.assetClass, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.sectors, normalized.sector, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.countries, normalized.country, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.currencies, entry.nativeValue.currency, entry.convertedValue);
    }

    for (const entry of valuation.cash) {
      CalculatePortfolioAllocation.#requireMoney(entry.convertedValue, 'convertedValue');
      CalculatePortfolioAllocation.#requireMoney(entry.balance, 'balance');
      const weight = CalculatePortfolioAllocation.#weight(entry.convertedValue, total);

      holdings.push(Object.freeze({
        kind: 'CASH',
        accountId: entry.accountId,
        value: entry.convertedValue,
        nativeCurrency: entry.balance.currency,
        weight,
        assetClass: CASH,
        sector: CASH,
        country: UNKNOWN
      }));

      CalculatePortfolioAllocation.#accumulate(dimensions.assetClasses, CASH, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.sectors, CASH, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.countries, UNKNOWN, entry.convertedValue);
      CalculatePortfolioAllocation.#accumulate(dimensions.currencies, entry.balance.currency, entry.convertedValue);
    }

    return Object.freeze({
      baseCurrency: valuation.baseCurrency,
      totalValue: total,
      holdings: Object.freeze(holdings.sort((a, b) => b.value.amount - a.value.amount)),
      assetClasses: CalculatePortfolioAllocation.#toEntries(dimensions.assetClasses, total),
      sectors: CalculatePortfolioAllocation.#toEntries(dimensions.sectors, total),
      countries: CalculatePortfolioAllocation.#toEntries(dimensions.countries, total),
      currencies: CalculatePortfolioAllocation.#toEntries(dimensions.currencies, total),
      summary: Object.freeze({
        positionsWeight: CalculatePortfolioAllocation.#weight(valuation.positionsValue, total),
        cashWeight: CalculatePortfolioAllocation.#weight(valuation.cashValue, total)
      })
    });
  }

  static #accumulate(map, key, value) {
    const current = map.get(key) ?? Money.zero(value.currency);
    map.set(key, current.add(value));
  }

  static #toEntries(map, total) {
    return Object.freeze(
      [...map.entries()]
        .map(([key, value]) => Object.freeze({ key, value, weight: CalculatePortfolioAllocation.#weight(value, total) }))
        .sort((a, b) => b.value.amount - a.value.amount || a.key.localeCompare(b.key))
    );
  }

  static #weight(value, total) {
    return total.amount > 0 ? value.amount / total.amount : null;
  }

  static #normalizeClassification(value) {
    if (value == null) {
      return { assetClass: UNKNOWN, sector: UNKNOWN, country: UNKNOWN };
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('La classification doit être un objet ou null.');
    }
    return {
      assetClass: CalculatePortfolioAllocation.#label(value.assetClass),
      sector: CalculatePortfolioAllocation.#label(value.sector),
      country: CalculatePortfolioAllocation.#label(value.country)
    };
  }

  static #label(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim().toUpperCase() : UNKNOWN;
  }

  static #requireValuation(value) {
    if (!value || typeof value !== 'object') {
      throw new TypeError('valuation est obligatoire.');
    }
    if (!Array.isArray(value.positions) || !Array.isArray(value.cash)) {
      throw new TypeError('valuation.positions et valuation.cash doivent être des tableaux.');
    }
    CalculatePortfolioAllocation.#requireMoney(value.positionsValue, 'positionsValue');
    CalculatePortfolioAllocation.#requireMoney(value.cashValue, 'cashValue');
    CalculatePortfolioAllocation.#requireMoney(value.totalValue, 'totalValue');
    if (value.totalValue.currency !== value.positionsValue.currency || value.totalValue.currency !== value.cashValue.currency) {
      throw new TypeError('La valorisation doit être consolidée dans une devise unique.');
    }
  }

  static #requireMoney(value, fieldName) {
    if (!(value instanceof Money)) {
      throw new TypeError(`${fieldName} doit être une instance de Money.`);
    }
  }
}
