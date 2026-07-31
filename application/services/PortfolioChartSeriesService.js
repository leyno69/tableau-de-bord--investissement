/** Transforme les valorisations en séries simples, stables et directement traçables. */
export class PortfolioChartSeriesService {
  build({ valuations }) {
    if (!Array.isArray(valuations)) throw new TypeError('valuations doit être un tableau.');
    const ordered = [...valuations].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let peak = null;
    const value = [];
    const invested = [];
    const drawdown = [];
    const cash = [];
    for (const item of ordered) {
      PortfolioChartSeriesService.#valuation(item);
      const total = item.totalValue.amount;
      const positions = item.positionsValue?.amount ?? total - (item.cashValue?.amount ?? 0);
      const cashAmount = item.cashValue?.amount ?? total - positions;
      peak = peak === null ? total : Math.max(peak, total);
      value.push(Object.freeze({ x: item.date, y: total }));
      invested.push(Object.freeze({ x: item.date, y: positions }));
      cash.push(Object.freeze({ x: item.date, y: cashAmount }));
      drawdown.push(Object.freeze({ x: item.date, y: peak === 0 ? 0 : PortfolioChartSeriesService.#round((total / peak) - 1) }));
    }
    const currency = ordered[0]?.totalValue?.currency ?? null;
    return Object.freeze({
      currency,
      labels: Object.freeze(value.map(point => point.x)),
      series: Object.freeze({ value: Object.freeze(value), invested: Object.freeze(invested), cash: Object.freeze(cash), drawdown: Object.freeze(drawdown) })
    });
  }

  static #valuation(item) {
    if (!item || typeof item !== 'object' || typeof item.date !== 'string' || !item.totalValue || !Number.isFinite(item.totalValue.amount) || typeof item.totalValue.currency !== 'string') {
      throw new TypeError('Chaque valorisation doit contenir date et totalValue valides.');
    }
  }
  static #round(value) { return Number(Number(value).toFixed(10)); }
}
