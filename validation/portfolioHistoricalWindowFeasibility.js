import { findHistoricalInstrumentRegistryEntry } from '../portfolio-historical-instrument-registry.js';

function parseDate(value, field) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} doit être une date ISO valide.`);
  return date;
}

function subtractYears(date, years) {
  const copy = new Date(date.getTime());
  copy.setUTCFullYear(copy.getUTCFullYear() - years);
  return copy;
}

export function assessExactHistoricalWindowForPreset(preset, { asOf }) {
  if (!preset || typeof preset !== 'object') throw new TypeError('preset doit être un objet.');
  if (!Number.isFinite(preset.horizonYears) || preset.horizonYears <= 0) throw new TypeError('horizonYears doit être positif.');
  const asOfDate = parseDate(asOf, 'asOf');
  const requiredStart = subtractYears(asOfDate, preset.horizonYears);
  const requiredStartIso = requiredStart.toISOString().slice(0, 10);

  const instruments = preset.orders.map(order => {
    const ticker = String(order.ticker ?? '').trim().toUpperCase();
    const entry = findHistoricalInstrumentRegistryEntry(ticker);
    if (!entry) return Object.freeze({ ticker, status: 'blocked', blocker: 'instrument-not-registered' });
    if (entry.status !== 'identified') return Object.freeze({ ticker, status: 'blocked', blocker: 'instrument-identity-ambiguous' });
    const inceptionDate = parseDate(entry.inceptionDate, `${ticker}.inceptionDate`);
    const exactHistorySufficient = inceptionDate.getTime() <= requiredStart.getTime();
    return Object.freeze({
      ticker,
      inceptionDate: entry.inceptionDate,
      requiredStart: requiredStartIso,
      exactHistorySufficient,
      status: exactHistorySufficient ? 'eligible' : 'blocked',
      blocker: exactHistorySufficient ? null : 'insufficient-exact-history'
    });
  });

  return Object.freeze({
    schemaVersion: 1,
    presetId: String(preset.id ?? ''),
    horizonYears: preset.horizonYears,
    asOf,
    requiredStart: requiredStartIso,
    exactReplayEligible: instruments.every(item => item.status === 'eligible'),
    instruments: Object.freeze(instruments)
  });
}
