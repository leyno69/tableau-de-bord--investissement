import { recordBootError, setBootPhase } from './boot-diagnostics.js';
import './interaction-audit.js';

const CURRENT_STORAGE_SCHEMA = 2;
const STORAGE_KEYS = Object.freeze({
  portfolio: 'invest-dashboard-portfolio',
  watchlist: 'invest-dashboard-watchlist',
  broker: 'invest-dashboard-active-broker',
  schema: 'leynor-storage-schema-version'
});

function readJson(storage, key) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    recordBootError(error, `storage.read.${key}`);
    return undefined;
  }
  if (raw == null || raw === '') return null;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function normalizePortfolio(value) {
  if (Array.isArray(value)) return { cash: 0, positions: value };
  if (!value || typeof value !== 'object') return { cash: 0, positions: [] };
  const positions = Array.isArray(value.positions)
    ? value.positions
    : Array.isArray(value.holdings)
      ? value.holdings
      : [];
  const cash = Number(value.cash);
  return { ...value, cash: Number.isFinite(cash) ? cash : 0, positions };
}

function normalizeWatchlist(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
  return [];
}

function safeSet(storage, key, value, repairedKeys, { json = true } = {}) {
  try {
    storage.setItem(key, json ? JSON.stringify(value) : String(value));
    if (!repairedKeys.includes(key)) repairedKeys.push(key);
    return true;
  } catch (error) {
    recordBootError(error, `storage.write.${key}`);
    return false;
  }
}

function readSchemaVersion(storage) {
  try {
    const parsed = Number(storage.getItem(STORAGE_KEYS.schema));
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    recordBootError(error, `storage.read.${STORAGE_KEYS.schema}`);
    return 0;
  }
}

function normalizeStoredValue(storage, key, normalizer, repairedKeys) {
  const current = readJson(storage, key);
  if (current === null) return;
  const normalized = normalizer(current);
  if (current === undefined || JSON.stringify(current) !== JSON.stringify(normalized)) {
    safeSet(storage, key, normalized, repairedKeys);
  }
}

function migrateStorage(storage, fromVersion, repairedKeys) {
  let version = fromVersion;
  if (version < 1) {
    normalizeStoredValue(storage, STORAGE_KEYS.portfolio, normalizePortfolio, repairedKeys);
    version = 1;
  }
  if (version < 2) {
    normalizeStoredValue(storage, STORAGE_KEYS.watchlist, normalizeWatchlist, repairedKeys);
    version = 2;
  }
  if (version !== fromVersion) safeSet(storage, STORAGE_KEYS.schema, version, repairedKeys, { json: false });
  return version;
}

function verifyStorageIntegrity(storage, repairedKeys) {
  normalizeStoredValue(storage, STORAGE_KEYS.portfolio, normalizePortfolio, repairedKeys);
  normalizeStoredValue(storage, STORAGE_KEYS.watchlist, normalizeWatchlist, repairedKeys);
}

function repairBrowserStorage(storage = globalThis.localStorage) {
  setBootPhase('repairing-storage');
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    setBootPhase('storage-unavailable');
    return Object.freeze({ repaired: false, keys: Object.freeze([]), schemaVersion: 0 });
  }

  const repairedKeys = [];
  const initialVersion = readSchemaVersion(storage);
  const schemaVersion = migrateStorage(storage, initialVersion, repairedKeys);
  verifyStorageIntegrity(storage, repairedKeys);

  try {
    const broker = storage.getItem(STORAGE_KEYS.broker);
    if (broker != null && typeof broker !== 'string') {
      storage.removeItem?.(STORAGE_KEYS.broker);
      repairedKeys.push(STORAGE_KEYS.broker);
    }
  } catch (error) {
    recordBootError(error, `storage.read.${STORAGE_KEYS.broker}`);
  }

  setBootPhase('storage-ready');
  return Object.freeze({
    repaired: repairedKeys.length > 0,
    keys: Object.freeze([...repairedKeys]),
    schemaVersion
  });
}

export {
  CURRENT_STORAGE_SCHEMA,
  STORAGE_KEYS,
  migrateStorage,
  normalizePortfolio,
  normalizeWatchlist,
  repairBrowserStorage,
  verifyStorageIntegrity
};
