export const defaultPortfolio = {
  cash: 0,
  positions: [
    {
      id: 1,
      name: 'iShares MSCI World Swap PEA UCITS ETF EUR (Acc)',
      ticker: 'A000',
      isin: 'IE0002XZSHO1',
      type: 'ETF',
      broker: 'trade-republic',
      quantity: 276.121345,
      avgPrice: 6.8626,
      price: 6.84,
      region: 'Monde'
    },
    {
      id: 2,
      name: 'Amundi PEA Asie Pacifique MSCI AC Asia Pacific Ex Japan UCITS ETF Acc',
      ticker: 'NK4W',
      isin: 'FR0011869312',
      type: 'ETF',
      broker: 'trade-republic',
      quantity: 9,
      avgPrice: 26.1911,
      price: 25.63,
      region: 'Asie-Pacifique hors Japon'
    }
  ]
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
