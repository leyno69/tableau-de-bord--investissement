import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEYS,
  normalizePortfolio,
  normalizeWatchlist,
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

test('convertit un ancien tableau de positions en portefeuille compatible', () => {
  const positions = [{ id: 1, ticker: 'WPEA' }];
  assert.deepEqual(normalizePortfolio(positions), { cash: 0, positions });
});

test('préserve les données compatibles et récupère holdings et cash', () => {
  const holdings = [{ id: 2, ticker: 'PAEJ' }];
  assert.deepEqual(normalizePortfolio({ cash: '42.5', holdings, owner: 'local' }), {
    cash: 42.5,
    holdings,
    owner: 'local',
    positions: holdings
  });
});

test('normalise une ancienne watchlist enveloppée', () => {
  const items = [{ ticker: 'NVDA' }];
  assert.deepEqual(normalizeWatchlist({ items }), items);
  assert.deepEqual(normalizeWatchlist({ invalid: true }), []);
});

test('répare les données locales corrompues avant le démarrage de app.js', () => {
  const storage = memoryStorage({
    [STORAGE_KEYS.portfolio]: '[{"ticker":"WPEA"}]',
    [STORAGE_KEYS.watchlist]: '{"items":[{"ticker":"NVDA"}]}'
  });

  const result = repairBrowserStorage(storage);

  assert.equal(result.repaired, true);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.portfolio)), {
    cash: 0,
    positions: [{ ticker: 'WPEA' }]
  });
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.watchlist)), [{ ticker: 'NVDA' }]);
});

test('remplace un JSON illisible par une structure sûre', () => {
  const storage = memoryStorage({
    [STORAGE_KEYS.portfolio]: '{cassé',
    [STORAGE_KEYS.watchlist]: 'pas-du-json'
  });

  repairBrowserStorage(storage);

  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.portfolio)), { cash: 0, positions: [] });
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEYS.watchlist)), []);
});
