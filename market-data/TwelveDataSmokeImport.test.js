import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditTwelveDataConfiguration,
  runTwelveDataSmokeImport,
} from './TwelveDataSmokeImport.js';

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

test('audite la présence du secret sans jamais exposer sa valeur', () => {
  const audit = auditTwelveDataConfiguration({ TWELVEDATA_API_KEY: 'secret-value' });
  assert.equal(audit.configured, true);
  assert.equal(audit.secretValueExposed, false);
  assert.equal(JSON.stringify(audit).includes('secret-value'), false);
});

test('bloque proprement si la clé est absente', async () => {
  await assert.rejects(
    () => runTwelveDataSmokeImport({
      symbol: 'AAPL',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      env: {},
    }),
    /TWELVEDATA_API_KEY is not configured/,
  );
});

test('limite le smoke import à cinq lignes', async () => {
  await assert.rejects(
    () => runTwelveDataSmokeImport({
      symbol: 'AAPL',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      outputSize: 6,
      env: { TWELVEDATA_API_KEY: 'x' },
    }),
    /between 1 and 5/,
  );
});

test('importe, empreinte et conserve les garde-fous scientifiques', async () => {
  let authorization;
  const result = await runTwelveDataSmokeImport({
    symbol: 'aapl',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    env: { TWELVEDATA_API_KEY: 'private-key' },
    now: () => '2026-08-03T05:45:00.000Z',
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization;
      return jsonResponse({
        status: 'ok',
        meta: { symbol: 'AAPL' },
        values: [
          { datetime: '2026-01-02', open: '100', high: '105', low: '99', close: '104', volume: '1000' },
        ],
      });
    },
  });

  assert.equal(authorization, 'apikey private-key');
  assert.equal(result.symbol, 'AAPL');
  assert.equal(result.recordCount, 1);
  assert.match(result.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.externallyValidated, false);
  assert.equal(result.productionReady, false);
  assert.equal(Object.isFrozen(result), true);
});

test('produit une empreinte déterministe', async () => {
  const options = {
    symbol: 'MSFT',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    env: { TWELVEDATA_API_KEY: 'private-key' },
    now: () => '2026-08-03T05:45:00.000Z',
    fetchImpl: async () => jsonResponse({
      status: 'ok',
      meta: { symbol: 'MSFT' },
      values: [{ datetime: '2026-01-02', open: '10', high: '11', low: '9', close: '10.5', volume: '50' }],
    }),
  };
  const first = await runTwelveDataSmokeImport(options);
  const second = await runTwelveDataSmokeImport(options);
  assert.equal(first.fingerprint, second.fingerprint);
});
