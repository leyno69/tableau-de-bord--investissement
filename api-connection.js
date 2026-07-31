const API_BASE_URL_KEY = 'leynor-api-base-url';
const API_TOKEN_KEY = 'invest-dashboard-api-token';
const BETA_PROXY_BASE_URL = '/api/leynor';

function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return `/${raw.replace(/^\/+|\/+$/g, '')}`;
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError('L’adresse du serveur doit utiliser HTTP ou HTTPS.');
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function getApiBaseUrl(storage = localStorage) {
  const stored = storage.getItem(API_BASE_URL_KEY);
  return normalizeApiBaseUrl(stored || BETA_PROXY_BASE_URL);
}

function setApiBaseUrl(value, storage = localStorage) {
  const normalized = normalizeApiBaseUrl(value);
  if (normalized && normalized !== BETA_PROXY_BASE_URL) storage.setItem(API_BASE_URL_KEY, normalized);
  else storage.removeItem(API_BASE_URL_KEY);
  return normalized || BETA_PROXY_BASE_URL;
}

function getApiToken(storage = localStorage) {
  return String(storage.getItem(API_TOKEN_KEY) || '').trim();
}

function setApiToken(value, storage = localStorage) {
  const normalized = String(value || '').trim();
  if (normalized) storage.setItem(API_TOKEN_KEY, normalized);
  else storage.removeItem(API_TOKEN_KEY);
  return normalized;
}

function usesSecureProxy(storage = localStorage) {
  return getApiBaseUrl(storage) === BETA_PROXY_BASE_URL;
}

function apiUrl(path, storage = localStorage) {
  const base = getApiBaseUrl(storage);
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${base}${normalizedPath}`;
}

export {
  API_BASE_URL_KEY,
  API_TOKEN_KEY,
  BETA_PROXY_BASE_URL,
  normalizeApiBaseUrl,
  getApiBaseUrl,
  setApiBaseUrl,
  getApiToken,
  setApiToken,
  usesSecureProxy,
  apiUrl
};
