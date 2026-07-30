const HORIZON_TRADING_DAYS = Object.freeze({ '1m': 21, '3m': 63, '6m': 126, '12m': 252 });

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isoDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide: ${value}`);
  return d.toISOString().slice(0, 10);
}

function validIsoTimestamp(value) {
  return value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString() : null;
}

function endOfUtcDay(date) {
  return `${date}T23:59:59.999Z`;
}

export function normalizeEodRows(rows = []) {
  const normalized = rows.map(row => ({
    date: isoDay(row.date),
    open: finite(row.open), high: finite(row.high), low: finite(row.low),
    close: finite(row.close), adjustedClose: finite(row.adjusted_close ?? row.adjustedClose ?? row.close),
    volume: finite(row.volume),
    availableAt: validIsoTimestamp(row.availableAt)
  })).sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set();
  return normalized.filter(row => {
    if (seen.has(row.date)) return false;
    seen.add(row.date);
    return true;
  });
}

export function auditPriceHistory(rows = [], { requireExplicitAvailability = false } = {}) {
  const issues = [];
  let previous = null;
  rows.forEach((row, index) => {
    if (previous && row.date <= previous.date) issues.push({ type: 'NON_MONOTONIC_DATE', index, date: row.date });
    if (!(row.adjustedClose > 0)) issues.push({ type: 'INVALID_ADJUSTED_CLOSE', index, date: row.date });
    if (row.volume != null && row.volume < 0) issues.push({ type: 'NEGATIVE_VOLUME', index, date: row.date });
    if (requireExplicitAvailability && !row.availableAt) issues.push({ type: 'MISSING_AVAILABLE_AT', index, date: row.date });
    if (row.availableAt && new Date(row.availableAt) > new Date(endOfUtcDay(row.date))) {
      issues.push({ type: 'AVAILABLE_AFTER_SESSION_DAY', index, date: row.date, availableAt: row.availableAt });
    }
    previous = row;
  });
  return { valid: issues.length === 0, rowCount: rows.length, firstDate: rows[0]?.date ?? null, lastDate: rows.at(-1)?.date ?? null, issues };
}

function pct(current, previous) {
  return previous > 0 && current != null ? current / previous - 1 : null;
}

function stdev(values) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return null;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  return Math.sqrt(clean.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (clean.length - 1));
}

function rowAvailableBy(row, asOfDate) {
  if (!row.availableAt) return true;
  return new Date(row.availableAt) <= new Date(endOfUtcDay(asOfDate));
}

export function buildPointInTimeFeatures(rows, index) {
  if (index < 252 || index >= rows.length) return null;
  const asOf = rows[index].date;
  const windowStart = index - 252;
  for (let i = windowStart; i <= index; i++) {
    if (!rowAvailableBy(rows[i], asOf)) {
      throw new Error(`Fuite temporelle détectée : ${rows[i].date} disponible seulement à ${rows[i].availableAt}.`);
    }
  }

  const close = rows[index].adjustedClose;
  const dailyReturns = [];
  for (let i = Math.max(1, index - 63 + 1); i <= index; i++) {
    dailyReturns.push(pct(rows[i].adjustedClose, rows[i - 1].adjustedClose));
  }
  const volatility63d = stdev(dailyReturns);
  return {
    asOf,
    close,
    return21d: pct(close, rows[index - 21].adjustedClose),
    return63d: pct(close, rows[index - 63].adjustedClose),
    return126d: pct(close, rows[index - 126].adjustedClose),
    return252d: pct(close, rows[index - 252].adjustedClose),
    volatility63dAnnualized: volatility63d == null ? null : volatility63d * Math.sqrt(252)
  };
}

export function buildForwardLabels(rows, index) {
  const labels = {};
  for (const [horizon, days] of Object.entries(HORIZON_TRADING_DAYS)) {
    const future = rows[index + days];
    labels[horizon] = future ? {
      observedAt: future.date,
      forwardReturn: pct(future.adjustedClose, rows[index].adjustedClose),
      positiveReturn: future.adjustedClose > rows[index].adjustedClose
    } : null;
  }
  return labels;
}

export function buildTimeSafeDataset(rawRows = [], { requireExplicitAvailability = false } = {}) {
  const rows = normalizeEodRows(rawRows);
  const audit = auditPriceHistory(rows, { requireExplicitAvailability });
  if (!audit.valid) return { audit, observations: [] };

  const observations = [];
  for (let i = 252; i < rows.length; i++) {
    const features = buildPointInTimeFeatures(rows, i);
    const labels = buildForwardLabels(rows, i);
    observations.push({ asOf: rows[i].date, features, labels });
  }
  return { audit, observations };
}

export function chronologicalSplit(observations, trainEnd, validationEnd) {
  if (!(trainEnd < validationEnd)) throw new Error('trainEnd doit précéder validationEnd.');
  return {
    train: observations.filter(x => x.asOf <= trainEnd),
    validation: observations.filter(x => x.asOf > trainEnd && x.asOf <= validationEnd),
    test: observations.filter(x => x.asOf > validationEnd)
  };
}

export { HORIZON_TRADING_DAYS };
