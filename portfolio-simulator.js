function finite(value, name, { min = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new TypeError(`${name} doit être un nombre supérieur ou égal à ${min}.`);
  return number;
}

function normalizePosition(position) {
  return {
    id: String(position.id || `${Date.now()}-${Math.random()}`),
    name: String(position.name || position.ticker || 'Actif fictif').trim(),
    ticker: String(position.ticker || 'SIM').trim().toUpperCase(),
    quantity: finite(position.quantity, 'quantity'),
    avgPrice: finite(position.avgPrice, 'avgPrice'),
    price: finite(position.price ?? position.avgPrice, 'price')
  };
}

export function createSimulation({ name = 'Scénario fictif', initialCash = 10000, positions = [] } = {}) {
  return {
    id: `simulation-${Date.now()}`,
    name: String(name).trim() || 'Scénario fictif',
    initialCash: finite(initialCash, 'initialCash'),
    cash: finite(initialCash, 'initialCash'),
    positions: positions.map(normalizePosition),
    transactions: [],
    isSimulation: true,
    createdAt: new Date().toISOString()
  };
}

export function buy(simulation, { ticker, name, amount, price }) {
  if (!simulation?.isSimulation) throw new TypeError('Le portefeuille cible doit être une simulation.');
  const investedAmount = finite(amount, 'amount', { min: 0.01 });
  const executionPrice = finite(price, 'price', { min: 0.000001 });
  if (investedAmount > simulation.cash) throw new RangeError('Liquidités fictives insuffisantes.');

  const normalizedTicker = String(ticker || '').trim().toUpperCase();
  if (!normalizedTicker) throw new TypeError('ticker est obligatoire.');
  const quantity = investedAmount / executionPrice;
  const existing = simulation.positions.find(position => position.ticker === normalizedTicker);

  if (existing) {
    const previousCost = existing.quantity * existing.avgPrice;
    existing.quantity += quantity;
    existing.avgPrice = (previousCost + investedAmount) / existing.quantity;
    existing.price = executionPrice;
  } else {
    simulation.positions.push(normalizePosition({ ticker: normalizedTicker, name, quantity, avgPrice: executionPrice, price: executionPrice }));
  }

  simulation.cash -= investedAmount;
  simulation.transactions.push({ type: 'BUY', ticker: normalizedTicker, amount: investedAmount, price: executionPrice, quantity, at: new Date().toISOString() });
  return simulation;
}

export function sell(simulation, { ticker, quantity, price }) {
  if (!simulation?.isSimulation) throw new TypeError('Le portefeuille cible doit être une simulation.');
  const normalizedTicker = String(ticker || '').trim().toUpperCase();
  const position = simulation.positions.find(item => item.ticker === normalizedTicker);
  if (!position) throw new RangeError('Position fictive introuvable.');
  const soldQuantity = finite(quantity, 'quantity', { min: 0.000001 });
  const executionPrice = finite(price, 'price', { min: 0.000001 });
  if (soldQuantity > position.quantity) throw new RangeError('Quantité fictive insuffisante.');

  const proceeds = soldQuantity * executionPrice;
  position.quantity -= soldQuantity;
  position.price = executionPrice;
  simulation.cash += proceeds;
  if (position.quantity <= 1e-12) simulation.positions = simulation.positions.filter(item => item !== position);
  simulation.transactions.push({ type: 'SELL', ticker: normalizedTicker, amount: proceeds, price: executionPrice, quantity: soldQuantity, at: new Date().toISOString() });
  return simulation;
}

export function simulateDca({ initialAmount = 0, monthlyAmount, months, annualReturn = 0 }) {
  const initial = finite(initialAmount, 'initialAmount');
  const monthly = finite(monthlyAmount, 'monthlyAmount');
  const duration = Math.floor(finite(months, 'months', { min: 1 }));
  const yearlyRate = Number(annualReturn);
  if (!Number.isFinite(yearlyRate) || yearlyRate <= -1) throw new TypeError('annualReturn doit être supérieur à -100 %.');
  const monthlyRate = Math.pow(1 + yearlyRate, 1 / 12) - 1;
  let value = initial;
  for (let month = 0; month < duration; month += 1) value = value * (1 + monthlyRate) + monthly;
  return Object.freeze({ finalValue: value, contributed: initial + monthly * duration, gain: value - initial - monthly * duration, months: duration, annualReturn: yearlyRate });
}

export function summarizeSimulation(simulation) {
  const positionsValue = simulation.positions.reduce((total, position) => total + position.quantity * position.price, 0);
  const totalValue = positionsValue + simulation.cash;
  return Object.freeze({ totalValue, positionsValue, cash: simulation.cash, pnl: totalValue - simulation.initialCash, transactionCount: simulation.transactions.length });
}
