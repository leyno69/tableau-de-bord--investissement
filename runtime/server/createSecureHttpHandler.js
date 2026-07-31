import { randomUUID, timingSafeEqual } from 'node:crypto';

export function createSecureHttpHandler({ handler, token = '', logger = console, clock = () => new Date() } = {}) {
  if (typeof handler !== 'function') throw new TypeError('handler doit être une fonction.');
  if (typeof token !== 'string') throw new TypeError('token doit être une chaîne.');
  if (!logger || typeof logger !== 'object') throw new TypeError('logger doit être un objet.');

  return async function secureHandler(request, response) {
    const requestId = request.headers['x-request-id'] || randomUUID();
    const startedAt = Date.now();
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('x-frame-options', 'DENY');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('cache-control', 'no-store');

    if (token && !authorized(request.headers.authorization, token)) {
      response.writeHead(401, { 'content-type': 'application/json; charset=utf-8', 'www-authenticate': 'Bearer' });
      response.end(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentification requise.' } }));
      log(logger, request, response.statusCode, requestId, startedAt, clock);
      return;
    }

    try {
      await handler(request, response);
    } finally {
      log(logger, request, response.statusCode, requestId, startedAt, clock);
    }
  };
}

function authorized(header, expected) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

function log(logger, request, statusCode, requestId, startedAt, clock) {
  logger.info?.(JSON.stringify({
    timestamp: new Date(clock()).toISOString(), requestId,
    method: request.method, path: String(request.url || '').split('?')[0],
    statusCode, durationMs: Date.now() - startedAt
  }));
}
