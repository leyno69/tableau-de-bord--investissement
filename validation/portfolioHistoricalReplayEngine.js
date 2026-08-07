function finite(value, field, { min = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new TypeError(`${field} doit être un nombre >= ${min}.`);
  return number;
}

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function dateOnly(value, field) {
  const normalized = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${field} doit être une date ISO YYYY-MM-DD.`);
  }
  return normalized;
}

function normalizeWeights(allocation) {
  if (!Array.isArray(allocation) || allocation.length === 0) throw new TypeError('allocation doit être un tableau non vide.');
  const seen = new Set();
  const normalized = allocation.map((item, index) => {
    const ticker = nonEmpty(item.ticker, `allocation[${index}].ticker`).toUpperCase();
    if (seen.has(ticker)) throw new TypeError(`ticker dupliqué dans allocation: ${ticker}`);
    seen.add(ticker);
    const weight = finite(item.weight, `allocation[${index}].weight`);
    return Object.freeze({ ticker, weight });
  });
  const total = normalized.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(total - 1) > 1e-10) throw new TypeError('la somme des poids doit être égale à 1.');
  return normalized;
}

function normalizeSeries(seriesByTicker, tickers) {
  if (!seriesByTicker || typeof seriesByTicker !== 'object' || Array.isArray(seriesByTicker)) throw new TypeError('seriesByTicker doit être un objet.');
  const result = new Map();
  for (const ticker of tickers) {
    const raw = seriesByTicker[ticker];
    if (!Array.isArray(raw) || raw.length === 0) throw new TypeError(`série absente pour ${ticker}.`);
    const seenDates = new Set();
    const points = raw.map((point, index) => {
      const date = dateOnly(point.date, `${ticker}[${index}].date`);
      if (seenDates.has(date)) throw new TypeError(`date dupliquée pour ${ticker}: ${date}`);
      seenDates.add(date);
      const availableAt = dateOnly(point.availableAt ?? point.date, `${ticker}[${index}].availableAt`);
      if (availableAt > date) throw new TypeError(`fuite temporelle pour ${ticker} au ${date}: donnée disponible seulement le ${availableAt}.`);
      return Object.freeze({ date, availableAt, price: finite(point.price, `${ticker}[${index}].price`, { min: 1e-12 }) });
    }).sort((a, b) => a.date.localeCompare(b.date));
    result.set(ticker, points);
  }
  return result;
}

function commonTradingDates(seriesMap, tickers) {
  const sets = tickers.map(ticker => new Set(seriesMap.get(ticker).map(point => point.date)));
  const firstDates = [...sets[0]];
  return firstDates.filter(date => sets.every(set => set.has(date))).sort();
}

function buildPriceMap(seriesMap) {
  const result = new Map();
  for (const [ticker, points] of seriesMap) result.set(ticker, new Map(points.map(point => [point.date, point.price])));
  return result;
}

function normalizeDatedCashEvents(events, field) {
  if (events == null) return [];
  if (!Array.isArray(events)) throw new TypeError(`${field} doit être un tableau.`);
  return events.map((event, index) => Object.freeze({
    date: dateOnly(event.date, `${field}[${index}].date`),
    amount: finite(event.amount, `${field}[${index}].amount`, { min: 0.01 })
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeRebalances(dates) {
  if (dates == null) return [];
  if (!Array.isArray(dates)) throw new TypeError('rebalanceDates doit être un tableau.');
  const seen = new Set();
  return dates.map((value, index) => {
    const date = dateOnly(value, `rebalanceDates[${index}]`);
    if (seen.has(date)) throw new TypeError(`date de rééquilibrage dupliquée: ${date}`);
    seen.add(date);
    return date;
  }).sort();
}

function transactionCost(notional, costBps) {
  return notional * costBps / 10000;
}

function portfolioValue(holdings, cash, prices) {
  let value = cash;
  for (const [ticker, quantity] of holdings) value += quantity * prices.get(ticker);
  return value;
}

function buyToTarget({ ticker, targetNotional, price, cash, holdings, costBps, events, date, reason }) {
  if (targetNotional <= 0) return cash;
  const cost = transactionCost(targetNotional, costBps);
  const required = targetNotional + cost;
  if (required > cash + 1e-9) throw new RangeError(`liquidités insuffisantes pour ${ticker} au ${date}.`);
  const quantity = targetNotional / price;
  holdings.set(ticker, (holdings.get(ticker) ?? 0) + quantity);
  events.push(Object.freeze({ type: 'BUY', reason, date, ticker, price, quantity, notional: targetNotional, cost }));
  return cash - required;
}

function sellNotional({ ticker, notional, price, cash, holdings, costBps, events, date, reason }) {
  if (notional <= 0) return cash;
  const held = holdings.get(ticker) ?? 0;
  const quantity = notional / price;
  if (quantity > held + 1e-9) throw new RangeError(`quantité insuffisante pour ${ticker} au ${date}.`);
  const cost = transactionCost(notional, costBps);
  const remaining = held - quantity;
  holdings.set(ticker, remaining < 1e-12 ? 0 : remaining);
  events.push(Object.freeze({ type: 'SELL', reason, date, ticker, price, quantity, notional, cost }));
  return cash + notional - cost;
}

function investCashByWeights({ amount, allocation, prices, cash, holdings, costBps, events, date, reason }) {
  const totalCostRate = costBps / 10000;
  const investable = amount / (1 + totalCostRate);
  let remainingCash = cash;
  for (const item of allocation) {
    remainingCash = buyToTarget({ ticker: item.ticker, targetNotional: investable * item.weight, price: prices.get(item.ticker), cash: remainingCash, holdings, costBps, events, date, reason });
  }
  return remainingCash;
}

function rebalance({ allocation, prices, cash, holdings, costBps, events, date }) {
  const valueBefore = portfolioValue(holdings, cash, prices);
  const targets = new Map(allocation.map(item => [item.ticker, valueBefore * item.weight]));
  let nextCash = cash;
  for (const item of allocation) {
    const ticker = item.ticker;
    const current = (holdings.get(ticker) ?? 0) * prices.get(ticker);
    const target = targets.get(ticker);
    if (current > target + 1e-9) nextCash = sellNotional({ ticker, notional: current - target, price: prices.get(ticker), cash: nextCash, holdings, costBps, events, date, reason: 'REBALANCE' });
  }
  for (const item of allocation) {
    const ticker = item.ticker;
    const current = (holdings.get(ticker) ?? 0) * prices.get(ticker);
    const target = targets.get(ticker);
    if (current < target - 1e-9) {
      const desired = target - current;
      const maxNotional = nextCash / (1 + costBps / 10000);
      const notional = Math.min(desired, maxNotional);
      nextCash = buyToTarget({ ticker, targetNotional: notional, price: prices.get(ticker), cash: nextCash, holdings, costBps, events, date, reason: 'REBALANCE' });
    }
  }
  return nextCash;
}

export function runHistoricalReplay(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const replayId = nonEmpty(input.replayId, 'replayId');
  const allocation = normalizeWeights(input.allocation);
  const tickers = allocation.map(item => item.ticker);
  const initialCash = finite(input.initialCash, 'initialCash', { min: 0.01 });
  const costBps = finite(input.costPolicy?.transactionCostBps ?? 0, 'transactionCostBps');
  const seriesMap = normalizeSeries(input.seriesByTicker, tickers);
  const pricesByTicker = buildPriceMap(seriesMap);
  const dates = commonTradingDates(seriesMap, tickers);
  if (dates.length === 0) throw new TypeError('aucune date de marché commune entre les séries.');

  const startDate = input.startDate ? dateOnly(input.startDate, 'startDate') : dates[0];
  const endDate = input.endDate ? dateOnly(input.endDate, 'endDate') : dates.at(-1);
  const replayDates = dates.filter(date => date >= startDate && date <= endDate);
  if (replayDates.length === 0) throw new TypeError('aucune date commune dans la fenêtre demandée.');
  if (replayDates[0] !== startDate) throw new TypeError('startDate doit être une date de marché commune à toutes les séries.');
  if (replayDates.at(-1) !== endDate) throw new TypeError('endDate doit être une date de marché commune à toutes les séries.');

  const contributions = normalizeDatedCashEvents(input.contributions, 'contributions');
  const rebalanceDates = normalizeRebalances(input.rebalanceDates);
  const validDates = new Set(replayDates);
  for (const event of [...contributions, ...rebalanceDates.map(date => ({ date }))]) {
    if (!validDates.has(event.date)) throw new TypeError(`date d’événement hors calendrier commun: ${event.date}.`);
  }

  const holdings = new Map(tickers.map(ticker => [ticker, 0]));
  const events = [];
  const valuePath = [];
  let cash = initialCash;
  let totalContributed = initialCash;
  let totalCosts = 0;

  const pricesAt = date => new Map(tickers.map(ticker => [ticker, pricesByTicker.get(ticker).get(date)]));
  const firstDate = replayDates[0];
  const initialPrices = pricesAt(firstDate);
  const beforeInitialEvents = events.length;
  cash = investCashByWeights({ amount: cash, allocation, prices: initialPrices, cash, holdings, costBps, events, date: firstDate, reason: 'INITIAL_ALLOCATION' });
  totalCosts += events.slice(beforeInitialEvents).reduce((sum, event) => sum + event.cost, 0);

  const contributionsByDate = new Map();
  for (const contribution of contributions) contributionsByDate.set(contribution.date, (contributionsByDate.get(contribution.date) ?? 0) + contribution.amount);
  const rebalanceSet = new Set(rebalanceDates);

  for (const date of replayDates) {
    const prices = pricesAt(date);
    const externalFlow = contributionsByDate.get(date) ?? 0;
    if (externalFlow > 0) {
      cash += externalFlow;
      totalContributed += externalFlow;
      events.push(Object.freeze({ type: 'CONTRIBUTION', date, amount: externalFlow }));
      const before = events.length;
      cash = investCashByWeights({ amount: externalFlow, allocation, prices, cash, holdings, costBps, events, date, reason: 'CONTRIBUTION' });
      totalCosts += events.slice(before).reduce((sum, event) => sum + event.cost, 0);
    }
    if (rebalanceSet.has(date) && date !== firstDate) {
      const before = events.length;
      cash = rebalance({ allocation, prices, cash, holdings, costBps, events, date });
      totalCosts += events.slice(before).reduce((sum, event) => sum + event.cost, 0);
    }
    valuePath.push(Object.freeze({ date, value: portfolioValue(holdings, cash, prices), externalFlow }));
  }

  const finalDate = replayDates.at(-1);
  const finalPrices = pricesAt(finalDate);
  const finalValue = portfolioValue(holdings, cash, finalPrices);
  const positions = Object.freeze(allocation.map(item => Object.freeze({ ticker: item.ticker, quantity: holdings.get(item.ticker), finalPrice: finalPrices.get(item.ticker), finalValue: holdings.get(item.ticker) * finalPrices.get(item.ticker) })));

  return Object.freeze({
    schemaVersion: 1,
    replayId,
    startDate,
    endDate,
    initialCash,
    totalContributed,
    totalCosts,
    cash,
    finalValue,
    pnlVsContributions: finalValue - totalContributed,
    positions,
    eventLog: Object.freeze(events),
    calendar: Object.freeze([...replayDates]),
    valuePath: Object.freeze(valuePath)
  });
}