import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_STORAGE_SCHEMA,
  STORAGE_KEYS,
  migrateStorage,
  repairBrowserStorage
} from '../../storage-bootstrap.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test("migre un stockage sans version jusqu'au schéma courant", () => {
  const storage = memoryStorage({
    [STORAGE_KEYS.portfolio]: '[{"ticker":"WPEA"}]',
    [STORAGE_KEYS.watchlist]: '{"items":[{"ticker":"NVDA"}]}'
  });
  const result = repairBrowserStorage(storage);
  assert.equal(result.schemaVersion, CURRENT_STORAGE_SCHEMA);
  assert.equal(storage.getItem(STORAGE_KEYS.schema), String(CURRENT_STORAGE_SCHEMA));
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.portfolio)), {
    cash: 0,
    positions: [{ ticker: 'WPEA' }]
  });
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.watchlist)), [{ ticker: 'NVDA' }]);
});

test('une migration déjà appliquée est idempotente', () => {
  const storage = memoryStorage({
    [STORAGE_KEYS.schema]: String(CURRENT_STORAGE_SCHEMA),
    [STORAGE_KEYS.portfolio]: '{"cash":0,"positions":[]}',
    [STORAGE_KEYS.watchlist]: '[]'
  });
  const repaired = [];
  const version = migrateStorage(storage, CURRENT_STORAGE_SCHEMA, repaired);
  assert.equal(version, CURRENT_STORAGE_SCHEMA);
  assert.deepEqual(repaired, []);
});
