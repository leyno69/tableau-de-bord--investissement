export const CAPITALS = Object.freeze([2000, 5000, 10000]);
export const PROFILES = Object.freeze({
  prudent: Object.freeze({ SPY: 0.35, MSFT: 0.1, AAPL: 0.08, GOOGL: 0.07, AMZN: 0.05, META: 0.03, NVDA: 0.04, AMD: 0.02, TSLA: 0.01, BTCUSD: 0.0, CASH: 0.25 }),
  modere: Object.freeze({ SPY: 0.25, MSFT: 0.12, AAPL: 0.1, GOOGL: 0.08, AMZN: 0.08, META: 0.06, NVDA: 0.09, AMD: 0.05, TSLA: 0.04, BTCUSD: 0.03, CASH: 0.1 }),
  agressif: Object.freeze({ SPY: 0.1, MSFT: 0.08, AAPL: 0.06, GOOGL: 0.07, AMZN: 0.08, META: 0.07, NVDA: 0.18, AMD: 0.12, TSLA: 0.1, BTCUSD: 0.09, CASH: 0.05 })
});

const ROTATIONS = Object.freeze([
  ['SPY','MSFT','AAPL','GOOGL','AMZN','META','NVDA','AMD','TSLA','BTCUSD'],
  ['SPY','AAPL','MSFT','AMZN','GOOGL','NVDA','META','TSLA','AMD','BTCUSD'],
  ['SPY','GOOGL','MSFT','AAPL','META','AMZN','AMD','NVDA','TSLA','BTCUSD'],
  ['SPY','MSFT','GOOGL','AAPL','NVDA','AMZN','META','AMD','BTCUSD','TSLA'],
  ['SPY','AAPL','AMZN','MSFT','GOOGL','META','NVDA','TSLA','AMD','BTCUSD']
]);

export function createPortfolioCohort({ variantsPerCell = 5 } = {}) {
  if (!Number.isInteger(variantsPerCell) || variantsPerCell < 1) throw new RangeError('variantsPerCell doit être un entier positif.');
  const portfolios = [];
  for (const capital of CAPITALS) {
    for (const [profile, base] of Object.entries(PROFILES)) {
      for (let variant = 0; variant < variantsPerCell; variant += 1) {
        const weights = perturbWeights(base, ROTATIONS[variant % ROTATIONS.length], variant);
        portfolios.push(Object.freeze({
          id: `${profile}-${capital}-${variant + 1}`,
          profile,
          initialCapital: capital,
          variant: variant + 1,
          weights
        }));
      }
    }
  }
  return Object.freeze(portfolios);
}

function perturbWeights(base, order, variant) {
  const result = { ...base };
  const delta = (variant - 2) * 0.005;
  for (let index = 0; index < order.length; index += 1) {
    const symbol = order[index];
    if (!(symbol in result)) continue;
    result[symbol] = Math.max(0, result[symbol] + (index % 2 === 0 ? delta : -delta));
  }
  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  return Object.freeze(Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value / total])));
}
