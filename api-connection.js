const API_BASE_URL_KEY = 'leynor-api-base-url';
const API_TOKEN_KEY = 'invest-dashboard-api-token';

function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError('L’adresse du serveur doit utiliser HTTP ou HTTPS.');
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function getApiBaseUrl(storage = localStorage) {
  return normalizeApiBaseUrl(storage.getItem(API_BASE_URL_KEY) || '');
}

function setApiBaseUrl(value, storage = localStorage) {
  const normalized = normalizeApiBaseUrl(value);
  if (normalized) storage.setItem(API_BASE_URL_KEY, normalized);
  else storage.removeItem(API_BASE_URL_KEY);
  return normalized;
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

function apiUrl(path, storage = localStorage) {
  const base = getApiBaseUrl(storage);
  if (!base) throw new Error('Aucune adresse de serveur n’est configurée.');
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${base}${normalizedPath}`;
}

export { API_BASE_URL_KEY, API_TOKEN_KEY, normalizeApiBaseUrl, getApiBaseUrl, setApiBaseUrl, getApiToken, setApiToken, apiUrl };
