export const defaultPortfolio = {
  cash: 0,
  positions: []
};

export function summarizePortfolio(portfolio) {
  const invested = portfolio.positions.reduce(
    (sum, p) => sum + p.quantity * p.avgPrice,
    0
  );

  const marketValue = portfolio.positions.reduce(
    (sum, p) => sum + p.quantity * p.price,
    0
  );

  const pnl = marketValue - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  return {
    invested,
    marketValue,
    totalValue: marketValue + portfolio.cash,
    pnl,
    pnlPct
  };
}

export function allocationByRegion(portfolio) {
  const totals = new Map();

  const marketValue = portfolio.positions.reduce(
    (sum, p) => sum + p.quantity * p.price,
    0
  );

  for (const p of portfolio.positions) {
    totals.set(
      p.region,
      (totals.get(p.region) || 0) + p.quantity * p.price
    );
  }

  return [...totals.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: marketValue ? (value / marketValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);
}
