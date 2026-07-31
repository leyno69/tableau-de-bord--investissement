import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeApiBaseUrl, apiUrl, setApiBaseUrl, getApiBaseUrl } from '../../api-connection.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('normalizes and persists a public backend URL', () => {
  const storage = memoryStorage();
  assert.equal(normalizeApiBaseUrl(' https://leynor-api.example.com/// '), 'https://leynor-api.example.com');
  setApiBaseUrl('https://leynor-api.example.com/', storage);
  assert.equal(getApiBaseUrl(storage), 'https://leynor-api.example.com');
  assert.equal(apiUrl('/health', storage), 'https://leynor-api.example.com/health');
});

test('rejects unsafe protocols and missing server configuration', () => {
  assert.throws(() => normalizeApiBaseUrl('javascript:alert(1)'), /HTTP ou HTTPS/);
  assert.throws(() => apiUrl('/health', memoryStorage()), /Aucune adresse de serveur/);
});

test('frontend installs routing before LEYNOR AI and exposes useful diagnostics', async () => {
  const [sync, router, worker] = await Promise.all([
    readFile(new URL('../../server-sync.js', import.meta.url), 'utf8'),
    readFile(new URL('../../api-fetch-router.js', import.meta.url), 'utf8'),
    readFile(new URL('../../service-worker.js', import.meta.url), 'utf8')
  ]);

  assert.ok(sync.indexOf("import './api-fetch-router.js'") < sync.indexOf("import './leynor-assistant.js'"));
  assert.match(sync, /Adresse publique du serveur LEYNOR/);
  assert.match(sync, /Token invalide/);
  assert.match(router, /Serveur LEYNOR non configuré/);
  assert.match(router, /\/leynor\//);
  assert.match(worker, /api-connection\.js/);
  assert.match(worker, /api-fetch-router\.js/);
});
