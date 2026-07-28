export const defaultPortfolio = {
  cash: 950,
  positions: [
    { id: 1, name: 'ETF MSCI World', ticker: 'WORLD', type: 'ETF', broker: 'trade-republic', quantity: 8, avgPrice: 112.5, price: 118.2, region: 'Monde' },
    { id: 2, name: 'ETF S&P 500', ticker: 'SP500', type: 'ETF', broker: 'trade-republic', quantity: 4, avgPrice: 96.4, price: 101.1, region: 'États-Unis' },
    { id: 3, name: 'ETF Asie ex Japon', ticker: 'ASIA', type: 'ETF', broker: 'trade-republic', quantity: 6, avgPrice: 38.1, price: 37.4, region: 'Asie émergente' }
  ]
};

export function summarizePortfolio(portfolio) {
  const invested = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.avgPrice, 0);
  const marketValue = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.price, 0);
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
  const marketValue = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.price, 0);
  for (const p of portfolio.positions) {
    totals.set(p.region, (totals.get(p.region) || 0) + p.quantity * p.price);
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value, percent: marketValue ? value / marketValue * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}
