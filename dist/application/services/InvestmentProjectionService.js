/** Simulateur mensuel déterministe, sans prédiction de marché ni dépendance externe. */
export class InvestmentProjectionService {
  simulate({ initialCapital = 0, monthlyContribution = 0, annualReturnRate = 0, years, annualContributionGrowthRate = 0, targetAmount = null, currency = 'EUR' }) {
    const initial = InvestmentProjectionService.#nonNegative(initialCapital, 'initialCapital');
    const monthly = InvestmentProjectionService.#nonNegative(monthlyContribution, 'monthlyContribution');
    const annualRate = InvestmentProjectionService.#rate(annualReturnRate, 'annualReturnRate');
    const contributionGrowth = InvestmentProjectionService.#rate(annualContributionGrowthRate, 'annualContributionGrowthRate');
    const duration = Number(years);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 100) throw new RangeError('years doit être un entier compris entre 1 et 100.');
    const normalizedTarget = targetAmount == null ? null : InvestmentProjectionService.#nonNegative(targetAmount, 'targetAmount');
    const normalizedCurrency = InvestmentProjectionService.#currency(currency);
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    let balance = initial;
    let contributed = initial;
    let currentContribution = monthly;
    let targetReachedAt = balance >= normalizedTarget && normalizedTarget !== null ? 0 : null;
    const yearly = [];
    for (let month = 1; month <= duration * 12; month += 1) {
      balance = balance * (1 + monthlyRate) + currentContribution;
      contributed += currentContribution;
      if (targetReachedAt === null && normalizedTarget !== null && balance >= normalizedTarget) targetReachedAt = month;
      if (month % 12 === 0) {
        yearly.push(Object.freeze({
          year: month / 12,
          balance: InvestmentProjectionService.#round(balance),
          contributed: InvestmentProjectionService.#round(contributed),
          gains: InvestmentProjectionService.#round(balance - contributed),
          monthlyContribution: InvestmentProjectionService.#round(currentContribution)
        }));
        currentContribution *= 1 + contributionGrowth;
      }
    }
    return Object.freeze({
      currency: normalizedCurrency,
      assumptions: Object.freeze({ initialCapital: initial, monthlyContribution: monthly, annualReturnRate: annualRate, annualContributionGrowthRate: contributionGrowth, years: duration, targetAmount: normalizedTarget }),
      finalBalance: InvestmentProjectionService.#round(balance),
      totalContributed: InvestmentProjectionService.#round(contributed),
      totalGains: InvestmentProjectionService.#round(balance - contributed),
      targetReached: targetReachedAt !== null,
      targetReachedAfterMonths: targetReachedAt,
      yearly: Object.freeze(yearly)
    });
  }

  static #nonNegative(value, field) { const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new RangeError(`${field} doit être positif ou nul.`); return number; }
  static #rate(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= -1 || number > 10) throw new RangeError(`${field} doit être supérieur à -100 % et raisonnable.`); return number; }
  static #currency(value) { if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) throw new TypeError('currency doit être une devise ISO.'); return value.trim().toUpperCase(); }
  static #round(value) { return Number(Number(value).toFixed(2)); }
}
