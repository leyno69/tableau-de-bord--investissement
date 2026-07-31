const FORWARDED_HEADERS = new Set(['accept', 'content-type', 'if-none-match', 'x-request-id']);

export default async function handler(request, response) {
  const backendUrl = normalizeBackendUrl(process.env.LEYNOR_BACKEND_URL);
  const backendToken = String(process.env.LEYNOR_BACKEND_TOKEN || '').trim();

  if (!backendUrl || !backendToken) {
    return response.status(503).json({
      error: {
        code: 'BETA_PROXY_NOT_CONFIGURED',
        message: 'Le proxy sécurisé LEYNOR n’est pas encore configuré.'
      }
    });
  }

  const path = normalizePath(request.query?.path);
  const destination = new URL(path, `${backendUrl}/`);
  copyQueryParameters(request.query, destination.searchParams);

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers || {})) {
    if (!FORWARDED_HEADERS.has(name.toLowerCase()) || value == null) continue;
    headers.set(name, Array.isArray(value) ? value.join(',') : String(value));
  }
  headers.set('authorization', `Bearer ${backendToken}`);
  headers.set('x-forwarded-host', String(request.headers?.host || ''));

  const method = String(request.method || 'GET').toUpperCase();
  const body = ['GET', 'HEAD'].includes(method) ? undefined : serializeBody(request.body, headers);

  try {
    const upstream = await fetch(destination, {
      method,
      headers,
      body,
      redirect: 'manual'
    });

    response.status(upstream.status);
    for (const [name, value] of upstream.headers.entries()) {
      if (isSafeResponseHeader(name)) response.setHeader(name, value);
    }
    response.setHeader('cache-control', 'no-store');
    const payload = Buffer.from(await upstream.arrayBuffer());
    return response.send(payload);
  } catch (error) {
    console.error('LEYNOR beta proxy error', error);
    return response.status(502).json({
      error: {
        code: 'BETA_PROXY_UPSTREAM_UNAVAILABLE',
        message: 'Le serveur LEYNOR est momentanément indisponible.'
      }
    });
  }
}

function normalizeBackendUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:') throw new Error('LEYNOR_BACKEND_URL doit utiliser HTTPS.');
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function normalizePath(value) {
  const segments = Array.isArray(value) ? value : [value].filter(Boolean);
  const safe = segments.map(segment => encodeURIComponent(decodeURIComponent(String(segment))));
  return safe.length ? safe.join('/') : 'health';
}

function copyQueryParameters(query, target) {
  for (const [key, value] of Object.entries(query || {})) {
    if (key === 'path' || value == null) continue;
    for (const item of Array.isArray(value) ? value : [value]) target.append(key, String(item));
  }
}

function serializeBody(body, headers) {
  if (body == null) return undefined;
  if (typeof body === 'string' || body instanceof Uint8Array) return body;
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return JSON.stringify(body);
}

function isSafeResponseHeader(name) {
  return ['content-type', 'etag', 'last-modified', 'x-request-id'].includes(name.toLowerCase());
}

export { normalizeBackendUrl, normalizePath, copyQueryParameters };
