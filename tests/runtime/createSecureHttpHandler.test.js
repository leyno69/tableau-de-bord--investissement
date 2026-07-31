import test from 'node:test';
import assert from 'node:assert/strict';

import { createSecureHttpHandler } from '../../runtime/server/createSecureHttpHandler.js';

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    writeHead(statusCode, headers = {}) { this.statusCode = statusCode; Object.assign(this.headers, headers); },
    end(body = '') { this.body = body; }
  };
}

test('refuse une requête sans jeton', async () => {
  let called = false;
  const handler = createSecureHttpHandler({ handler: async () => { called = true; }, token: 'secret', logger: { info() {} } });
  const response = responseRecorder();
  await handler({ method: 'GET', url: '/portfolios', headers: {} }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(called, false);
  assert.equal(response.headers['x-frame-options'], 'DENY');
});

test('accepte un jeton Bearer valide et journalise', async () => {
  const logs = [];
  const handler = createSecureHttpHandler({
    handler: async (_request, response) => { response.statusCode = 204; response.end(); },
    token: 'secret', logger: { info(value) { logs.push(JSON.parse(value)); } },
    clock: () => new Date('2026-07-31T05:00:00.000Z')
  });
  const response = responseRecorder();
  await handler({ method: 'GET', url: '/portfolios?x=1', headers: { authorization: 'Bearer secret' } }, response);
  assert.equal(response.statusCode, 204);
  assert.equal(logs[0].path, '/portfolios');
  assert.equal(typeof logs[0].requestId, 'string');
});
