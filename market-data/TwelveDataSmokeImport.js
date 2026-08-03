import { createHash } from 'node:crypto';
import { TwelveDataProvider } from './TwelveDataProvider.js';

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertIsoDate(value, name) {
  const normalized = assertNonEmptyString(value, name);
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${name} must be ISO-compatible`);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function auditTwelveDataConfiguration(env = process.env) {
  const present = typeof env.TWELVEDATA_API_KEY === 'string' && env.TWELVEDATA_API_KEY.trim().length > 0;
  return deepFreeze({
    secretName: 'TWELVEDATA_API_KEY',
    configured: present,
    secretValueExposed: false,
    readyForSmokeImport: present,
    readyForExternalValidation: false,
    readyForProduction: false,
    blocker: present ? null : 'TWELVEDATA_API_KEY is not configured',
  });
}

export async function runTwelveDataSmokeImport({
  symbol,
  startDate,
  endDate,
  interval = '1day',
  outputSize = 5,
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date().toISOString(),
} = {}) {
  const audit = auditTwelveDataConfiguration(env);
  if (!audit.configured) throw new Error(audit.blocker);
  if (!Number.isInteger(outputSize) || outputSize < 1 || outputSize > 5) {
    throw new RangeError('outputSize must be an integer between 1 and 5 for the smoke import');
  }

  const normalizedSymbol = assertNonEmptyString(symbol, 'symbol').toUpperCase();
  const normalizedStart = assertIsoDate(startDate, 'startDate');
  const normalizedEnd = assertIsoDate(endDate, 'endDate');
  if (normalizedStart > normalizedEnd) throw new RangeError('startDate must be before or equal to endDate');

  const provider = new TwelveDataProvider({
    apiKey: env.TWELVEDATA_API_KEY,
    fetchImpl,
  });

  const result = await provider.fetchPrices({
    symbol: normalizedSymbol,
    interval,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    outputSize,
  });

  const canonical = JSON.stringify(result.prices);
  const fingerprint = `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
  const temporalViolations = result.prices
    .filter((row) => row.availableAt > row.observedAt)
    .map((row) => ({ symbol: row.symbol, observedAt: row.observedAt, availableAt: row.availableAt }));

  return deepFreeze({
    providerId: result.providerId,
    importedAt: assertIsoDate(now(), 'importedAt'),
    symbol: normalizedSymbol,
    interval,
    requestedRange: { startDate: normalizedStart, endDate: normalizedEnd },
    recordCount: result.recordCount,
    fingerprint,
    temporalAuditPassed: temporalViolations.length === 0,
    temporalViolations,
    externallyValidated: false,
    productionReady: false,
    notice: 'This smoke import verifies connectivity, schema and deterministic fingerprinting only. It does not establish point-in-time validity or external scientific validation.',
  });
}
