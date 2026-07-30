import { URL } from 'node:url';

/**
 * Convertit l’adaptateur HTTP indépendant en handler compatible node:http.
 */
export function createNodeHttpHandler({ httpAdapter, maxBodyBytes = 1_000_000 }) {
  if (!httpAdapter || typeof httpAdapter.handle !== 'function') {
    throw new TypeError('httpAdapter doit implémenter handle().');
  }
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new RangeError('maxBodyBytes doit être un entier strictement positif.');
  }

  return async function nodeHttpHandler(request, response) {
    try {
      const body = await readJsonBody(request, maxBodyBytes);
      const url = new URL(request.url ?? '/', 'http://localhost');
      const result = await httpAdapter.handle({
        method: request.method ?? 'GET',
        path: url.pathname,
        body
      });

      response.writeHead(result.statusCode, result.headers);
      response.end(JSON.stringify(result.body));
    } catch (error) {
      const statusCode = error?.code === 'BODY_TOO_LARGE' ? 413 : 400;
      response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({
        error: {
          code: statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
          message: statusCode === 413 ? 'Le corps de la requête est trop volumineux.' : 'Le corps JSON est invalide.'
        }
      }));
    }
  };
}

async function readJsonBody(request, maxBodyBytes) {
  if (request.method === 'GET' || request.method === 'HEAD') return null;

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new RangeError('Corps trop volumineux.');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }

  if (size === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
