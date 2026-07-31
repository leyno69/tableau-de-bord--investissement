export const PERFORMANCE_PERIODS = Object.freeze(['1D', '1W', '1M', 'YTD', '1Y']);

export class PortfolioPeriodPerformanceService {
  constructor({ valuationService }) {
    if (!valuationService || typeof valuationService.history !== 'function') throw new TypeError('valuationService doit implémenter history().');
    this.valuationService = valuationService;
  }

  async calculate({ portfolioId, date, marketDataPolicy = 'partial' }) {
    const end = PortfolioPeriodPerformanceService.#date(date, 'date');
    const results = await Promise.all(PERFORMANCE_PERIODS.map(async period => {
      const requestedFrom = PortfolioPeriodPerformanceService.#startDate(period, end);
      const history = await this.valuationService.history({ portfolioId, from: requestedFrom, to: end, marketDataPolicy });
      const usable = history.filter(item => item?.totalValue && Number.isFinite(item.totalValue.amount));
      if (usable.length === 0) return Object.freeze({ period, requestedFrom, from: null, to: end, startValue: null, endValue: null, absoluteChange: null, rate: null, complete: false });
      const first = usable[0];
      const last = usable.at(-1);
      const amount = last.totalValue.amount - first.totalValue.amount;
      return Object.freeze({
        period,
        requestedFrom,
        from: first.date,
        to: last.date,
        startValue: first.totalValue,
        endValue: last.totalValue,
        absoluteChange: Object.freeze({ amount: PortfolioPeriodPerformanceService.#round(amount), currency: last.totalValue.currency }),
        rate: first.totalValue.amount === 0 ? null : PortfolioPeriodPerformanceService.#round(amount / first.totalValue.amount),
        complete: usable.every(item => item.complete !== false)
      });
    }));
    return Object.freeze({ portfolioId, date: end, periods: Object.freeze(Object.fromEntries(results.map(result => [result.period, result]))) });
  }

  static #startDate(period, end) {
    const date = new Date(`${end}T00:00:00.000Z`);
    switch (period) {
      case '1D': date.setUTCDate(date.getUTCDate() - 1); break;
      case '1W': date.setUTCDate(date.getUTCDate() - 7); break;
      case '1M': date.setUTCMonth(date.getUTCMonth() - 1); break;
      case 'YTD': return `${date.getUTCFullYear()}-01-01`;
      case '1Y': date.setUTCFullYear(date.getUTCFullYear() - 1); break;
      default: throw new RangeError(`Période non prise en charge : ${period}`);
    }
    return date.toISOString().slice(0, 10);
  }

  static #date(value, field) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} doit être une date civile au format YYYY-MM-DD.`);
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (parsed.toISOString().slice(0, 10) !== value) throw new TypeError(`${field} doit être une date civile valide.`);
    return value;
  }

  static #round(value) { return Number(Number(value).toFixed(10)); }
}
