import { createHash } from 'node:crypto';
import { validationSummary, compareToBenchmark } from '../modeling/probability-validation.js';

function probability(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new TypeError(`${field} doit être compris entre 0 et 1.`);
  return number;
}

function iso(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new TypeError(`${field} doit être une date ISO UTC.`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date ISO UTC.`);
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (new Date(timestamp).toISOString() !== canonical) throw new TypeError(`${field} doit être une date ISO UTC valide.`);
  return value;
}

function normalizeIntervals(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('intervals doit être un objet.');
  const normalized = {};
  for (const [rawLevel, interval] of Object.entries(input).sort(([left], [right]) => Number(left) - Number(right))) {
    const level = probability(rawLevel, `intervals.${rawLevel}.level`);
    if (!interval || typeof interval !== 'object' || Array.isArray(interval)) throw new TypeError(`intervals.${rawLevel} doit être un objet.`);
    const lower = Number(interval.lower); const upper = Number(interval.upper);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) throw new TypeError(`intervals.${rawLevel} doit avoir des bornes finies et ordonnées.`);
    normalized[String(level)] = Object.freeze({ lower, upper });
  }
  return Object.freeze(normalized);
}

function wilson(successes, total, z = 1.959963984540054) {
  if (!total) return null;
  const p = successes / total; const den = 1 + z * z / total; const center = (p + z * z / (2 * total)) / den;
  const margin = z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / den;
  return Object.freeze({ lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) });
}

export function evaluateIntervalCoverage(records, levels = [0.5, 0.9]) {
  return Object.freeze(levels.map(level => {
    probability(level, 'level');
    const eligible = records.filter(record => Number.isFinite(record.intervals?.[String(level)]?.lower) && Number.isFinite(record.intervals?.[String(level)]?.upper) && Number.isFinite(record.outcome));
    const hits = eligible.filter(record => record.outcome >= record.intervals[String(level)].lower && record.outcome <= record.intervals[String(level)].upper).length;
    const rate = eligible.length ? hits / eligible.length : null; const ci = wilson(hits, eligible.length);
    return Object.freeze({ level, sampleSize: eligible.length, hits, observedCoverage: rate, wilson95: ci, compatible: ci ? ci.lower <= level && ci.upper >= level : false });
  }));
}

export function evaluateProbabilityCalibration(records, benchmarkProbability) {
  const pairs = records.map(record => ({ probability: record.probability, outcome: record.binaryOutcome }));
  const model = validationSummary(pairs);
  const benchmark = validationSummary(records.map(record => ({ probability: benchmarkProbability, outcome: record.binaryOutcome })));
  return Object.freeze({ model, benchmark, comparison: compareToBenchmark(model, benchmark) });
}

function fingerprint(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export function createProspectiveForecast(input) {
  const payload = { schemaVersion: 1, forecastId: String(input.forecastId || '').trim(), engineCommit: String(input.engineCommit || '').trim(), portfolioId: String(input.portfolioId || '').trim(), asOf: iso(input.asOf, 'asOf'), maturesAt: iso(input.maturesAt, 'maturesAt'), horizonMonths: Number(input.horizonMonths), probability: probability(input.probability, 'probability'), intervals: normalizeIntervals(input.intervals), assumptionsFingerprint: String(input.assumptionsFingerprint || '').trim(), createdWithoutOutcomeAccess: input.createdWithoutOutcomeAccess === true };
  if (!payload.forecastId || !payload.engineCommit || !payload.portfolioId || !payload.assumptionsFingerprint) throw new TypeError('identifiants et empreintes requis.');
  if (!Number.isInteger(payload.horizonMonths) || payload.horizonMonths < 1) throw new TypeError('horizonMonths invalide.');
  if (Date.parse(payload.maturesAt) <= Date.parse(payload.asOf)) throw new TypeError('maturesAt doit être postérieur à asOf.');
  if (!payload.createdWithoutOutcomeAccess) throw new TypeError('createdWithoutOutcomeAccess doit être true.');
  return Object.freeze({ ...payload, fingerprint: fingerprint(payload) });
}

export function settleProspectiveForecast(forecast, { observedAt, outcome, binaryOutcome }, now = new Date().toISOString()) {
  const normalizedNow = iso(now, 'now');
  if (Date.parse(normalizedNow) < Date.parse(forecast.maturesAt)) throw new Error('prévision non mature : lecture du résultat interdite.');
  if (typeof binaryOutcome !== 'boolean') throw new TypeError('binaryOutcome doit être booléen.');
  const normalized = { forecastFingerprint: forecast.fingerprint, observedAt: iso(observedAt, 'observedAt'), outcome: Number(outcome), binaryOutcome };
  if (!Number.isFinite(normalized.outcome)) throw new TypeError('outcome doit être fini.');
  if (Date.parse(normalized.observedAt) < Date.parse(forecast.maturesAt)) throw new Error('observedAt antérieur à la maturité.');
  if (Date.parse(normalized.observedAt) > Date.parse(normalizedNow)) throw new Error('observedAt postérieur à now.');
  return Object.freeze({ ...normalized, fingerprint: fingerprint(normalized) });
}
