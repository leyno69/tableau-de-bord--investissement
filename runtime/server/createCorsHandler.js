const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'authorization,content-type';

export function createCorsHandler({ allowedOrigins = [] } = {}) {
  const origins = new Set(normalizeOrigins(allowedOrigins));

  return Object.freeze({
    apply(request, response) {
      const origin = request.headers?.origin;
      if (!origin || !origins.has(origin)) return false;

      response.setHeader('access-control-allow-origin', origin);
      response.setHeader('vary', appendVary(response.getHeader('vary'), 'Origin'));
      response.setHeader('access-control-allow-methods', ALLOWED_METHODS);
      response.setHeader('access-control-allow-headers', ALLOWED_HEADERS);
      response.setHeader('access-control-max-age', '600');

      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        return true;
      }
      return false;
    }
  });
}

function normalizeOrigins(values) {
  if (!Array.isArray(values)) throw new TypeError('allowedOrigins doit être un tableau.');
  return values.map(value => {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError('Chaque origine CORS doit être une chaîne non vide.');
    const origin = new URL(value.trim()).origin;
    if (!origin.startsWith('https://') && origin !== 'http://localhost') {
      throw new RangeError('Les origines CORS doivent utiliser HTTPS, sauf localhost.');
    }
    return origin;
  });
}

function appendVary(current, value) {
  const values = String(current || '').split(',').map(item => item.trim()).filter(Boolean);
  if (!values.includes(value)) values.push(value);
  return values.join(', ');
}
