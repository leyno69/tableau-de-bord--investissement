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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new TypeError(`${field} doit être une date ISO YYYY-MM-DD.`);
  // Date.parse ne rejette pas un jour calendaire inexistant (ex. 30
  // février) : il le fait glisser en silence vers le mois suivant. L'aller-
  // retour vers toISOString() détecte ce glissement.
  const parsed = Date.parse(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== normalized) {
    throw new TypeError(`${field} doit être une date calendaire valide.`);
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

function normalizeCostPolicy(costPolicy = {}) {
  const transactionCostBps = finite(costPolicy.transactionCostBps ?? 0, 'transactionCostBps');
  const rawExempt = costPolicy.exemptTickers ?? [];
  if (!Array.isArray(rawExempt)) throw new TypeError('costPolicy.exemptTickers doit être un tableau.');
  const exemptTickers = new Set(rawExempt.map((ticker, index) => nonEmpty(ticker, `costPolicy.exemptTickers[${index}]`).toUpperCase()));
  return Object.freeze({ transactionCostBps, exemptTickers });
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

function effectiveCostBps(ticker, costPolicy) {
  return costPolicy.exemptTickers.has(ticker) ? 0 : costPolicy.transactionCostBps;
}

function portfolioValue(holdings, cash, prices) {
  let value = cash;
  for (const [ticker, quantity] of holdings) value += quantity * prices.get(ticker);
  return value;
}

function buyToTarget({ ticker, targetNotional, price, cash, holdings, costPolicy, events, date, reason }) {
  if (targetNotional <= 0) return cash;
  const costBps = effectiveCostBps(ticker, costPolicy);
  const cost = transactionCost(targetNotional, costBps);
  const required = targetNotional + cost;
  if (required > cash + 1e-9) throw new RangeError(`liquidités insuffisantes pour ${ticker} au ${date}.`);
  const quantity = targetNotional / price;
  holdings.set(ticker, (holdings.get(ticker) ?? 0) + quantity);
  events.push(Object.freeze({ type: 'BUY', reason, date, ticker, price, quantity, notional: targetNotional, cost }));
  return cash - required;
}

function sellNotional({ ticker, notional, price, cash, holdings, costPolicy, events, date, reason }) {
  if (notional <= 0) return cash;
  const held = holdings.get(ticker) ?? 0;
  const quantity = notional / price;
  if (quantity > held + 1e-9) throw new RangeError(`quantité insuffisante pour ${ticker} au ${date}.`);
  const costBps = effectiveCostBps(ticker, costPolicy);
  const cost = transactionCost(notional, costBps);
  const remaining = held - quantity;
  holdings.set(ticker, remaining < 1e-12 ? 0 : remaining);
  events.push(Object.freeze({ type: 'SELL', reason, date, ticker, price, quantity, notional, cost }));
  return cash + notional - cost;
}

function investCashByWeights({ amount, allocation, prices, cash, holdings, costPolicy, events, date, reason }) {
  const weightedCostRate = allocation.reduce((sum, item) => sum + item.weight * effectiveCostBps(item.ticker, costPolicy) / 10000, 0);
  const investable = amount / (1 + weightedCostRate);
  let remainingCash = cash;
  for (const item of allocation) {
    remainingCash = buyToTarget({ ticker: item.ticker, targetNotional: investable * item.weight, price: prices.get(item.ticker), cash: remainingCash, holdings, costPolicy, events, date, reason });
  }
  return remainingCash;
}

function rebalance({ allocation, prices, cash, holdings, costPolicy, events, date }) {
  const valueBefore = portfolioValue(holdings, cash, prices);
  const targets = new Map(allocation.map(item => [item.ticker, valueBefore * item.weight]));
  let nextCash = cash;
  for (const item of allocation) {
    const ticker = item.ticker;
    const current = (holdings.get(ticker) ?? 0) * prices.get(ticker);
    const target = targets.get(ticker);
    if (current > target + 1e-9) nextCash = sellNotional({ ticker, notional: current - target, price: prices.get(ticker), cash: nextCash, holdings, costPolicy, events, date, reason: 'REBALANCE' });
  }

  const buyNeeds = allocation
    .map(item => {
      const ticker = item.ticker;
      const current = (holdings.get(ticker) ?? 0) * prices.get(ticker);
      return { ticker, desired: targets.get(ticker) - current };
    })
    .filter(need => need.desired > 1e-9);

  if (buyNeeds.length > 0) {
    const totalDesired = buyNeeds.reduce((sum, need) => sum + need.desired, 0);
    // Un déficit de trésorerie (dû aux coûts de transaction des ventes et
    // achats de rééquilibrage) est réparti proportionnellement aux besoins
    // de chaque actif, sur le même principe que investCashByWeights —
    // jamais dans l'ordre du tableau allocation, ce qui privilégiait
    // arbitrairement les premiers actifs listés au détriment des suivants.
    const weightedCostRate = buyNeeds.reduce(
      (sum, need) => sum + (need.desired / totalDesired) * effectiveCostBps(need.ticker, costPolicy) / 10000,
      0
    );
    const investable = nextCash / (1 + weightedCostRate);
    const scale = Math.min(1, investable / totalDesired);
    for (const need of buyNeeds) {
      nextCash = buyToTarget({ ticker: need.ticker, targetNotional: need.desired * scale, price: prices.get(need.ticker), cash: nextCash, holdings, costPolicy, events, date, reason: 'REBALANCE' });
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
  const costPolicy = normalizeCostPolicy(input.costPolicy);
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
  cash = investCashByWeights({ amount: cash, allocation, prices: initialPrices, cash, holdings, costPolicy, events, date: firstDate, reason: 'INITIAL_ALLOCATION' });
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
      cash = investCashByWeights({ amount: externalFlow, allocation, prices, cash, holdings, costPolicy, events, date, reason: 'CONTRIBUTION' });
      totalCosts += events.slice(before).reduce((sum, event) => sum + event.cost, 0);
    }
    if (rebalanceSet.has(date)) {
      // Aucun cas particulier pour firstDate : rebalance() ne produit un
      // BUY/SELL que si un actif s'écarte du poids cible de plus de 1e-9 ;
      // juste après l'allocation initiale, tout est déjà au poids cible, et
      // l'appel devient naturellement un no-op silencieux et sans coût —
      // pas un no-op caché comme avant, où la date était ignorée sans trace.
      const before = events.length;
      cash = rebalance({ allocation, prices, cash, holdings, costPolicy, events, date });
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