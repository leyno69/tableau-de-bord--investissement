import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BETA_PROXY_BASE_URL, normalizeApiBaseUrl, apiUrl, setApiBaseUrl, getApiBaseUrl, usesSecureProxy } from '../../api-connection.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('uses the secure beta proxy by default', () => {
  const storage = memoryStorage();
  assert.equal(getApiBaseUrl(storage), BETA_PROXY_BASE_URL);
  assert.equal(apiUrl('/health', storage), '/api/leynor/health');
  assert.equal(usesSecureProxy(storage), true);
});

test('normalizes and persists an explicit public backend URL', () => {
  const storage = memoryStorage();
  assert.equal(normalizeApiBaseUrl(' https://leynor-api.example.com/// '), 'https://leynor-api.example.com');
  setApiBaseUrl('https://leynor-api.example.com/', storage);
  assert.equal(getApiBaseUrl(storage), 'https://leynor-api.example.com');
  assert.equal(apiUrl('/health', storage), 'https://leynor-api.example.com/health');
  assert.equal(usesSecureProxy(storage), false);
});

test('rejects unsafe protocols and accepts a same-origin path', () => {
  assert.throws(() => normalizeApiBaseUrl('javascript:alert(1)'), /HTTP ou HTTPS/);
  assert.equal(normalizeApiBaseUrl('/api/leynor/'), '/api/leynor');
});

test('frontend installs routing before LEYNOR AI and includes the proxy', async () => {
  const [sync, router, worker, proxy] = await Promise.all([
    readFile(new URL('../../server-sync.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api-fetch-router.js', import.meta.url), 'utf8'),
    readFile(new URL('../../service-worker.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api/leynor/[...path].js', import.meta.url), 'utf8')
  ]);
  assert.ok(sync.indexOf("import './api-fetch-router.js'") < sync.indexOf("import './leynor-assistant.js'"));
  assert.match(sync, /Bêta connectée/);
  assert.match(sync, /usesSecureProxy/);
  assert.match(router, /\/leynor\//);
  assert.match(worker, /api-connection\.js/);
  assert.match(proxy, /LEYNOR_BACKEND_URL/);
  assert.match(proxy, /LEYNOR_BACKEND_TOKEN/);
});
