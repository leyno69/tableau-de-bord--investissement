const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class InstrumentCatalogHttpAdapter {
  constructor({ catalog, importer = null }) {
    for (const method of ['create', 'get', 'search', 'update', 'replaceProviderMappings', 'remove']) {
      if (!catalog || typeof catalog[method] !== 'function') throw new TypeError(`catalog doit implémenter ${method}().`);
    }
    if (importer !== null && typeof importer.import !== 'function') throw new TypeError('importer doit implémenter import().');
    this.catalog = catalog;
    this.importer = importer;
  }

  async handle(request) {
    const route = match(request.method, request.path);
    if (!route) return null;
    try {
      let data;
      if (route.name === 'import') {
        if (!this.importer) return response(501, { error: { code: 'IMPORT_NOT_CONFIGURED', message: 'Import non configuré.' } });
        data = await this.importer.import(body(request.body));
      }
      if (route.name === 'create') data = await this.catalog.create(body(request.body));
      if (route.name === 'list') data = await this.catalog.search(request.query?.q ?? '');
      if (route.name === 'get') data = await this.catalog.get(route.id);
      if (route.name === 'update') data = await this.catalog.update(route.id, body(request.body));
      if (route.name === 'mappings') data = await this.catalog.replaceProviderMappings(route.id, body(request.body).providerMappings);
      if (route.name === 'delete') { await this.catalog.remove(route.id); return response(204, null); }
      return response(route.name === 'create' ? 201 : 200, { data });
    } catch (error) {
      const code = error?.code;
      if (code === 'INSTRUMENT_NOT_FOUND') return response(404, { error: { code, message: error.message } });
      if (code === 'INSTRUMENT_CONFLICT') return response(409, { error: { code, message: error.message } });
      if (code === 'IMPORT_PARSE_ERROR') return response(400, { error: { code, message: error.message } });
      if (error instanceof TypeError || error instanceof RangeError) return response(400, { error: { code: 'INVALID_REQUEST', message: error.message } });
      return response(500, { error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } });
    }
  }
}

function match(method, path) {
  const normalizedMethod = String(method ?? '').toUpperCase();
  const normalizedPath = String(path ?? '').split('?')[0];
  if (normalizedMethod === 'POST' && /^\/instruments\/import\/?$/.test(normalizedPath)) return { name: 'import' };
  if (normalizedMethod === 'POST' && /^\/instruments\/?$/.test(normalizedPath)) return { name: 'create' };
  if (normalizedMethod === 'GET' && /^\/instruments\/?$/.test(normalizedPath)) return { name: 'list' };
  const mappings = normalizedPath.match(/^\/instruments\/([^/]+)\/provider-mappings\/?$/);
  if (normalizedMethod === 'PUT' && mappings) return { name: 'mappings', id: decodeURIComponent(mappings[1]) };
  const item = normalizedPath.match(/^\/instruments\/([^/]+)\/?$/);
  if (!item) return null;
  const names = { GET: 'get', PUT: 'update', DELETE: 'delete' };
  return names[normalizedMethod] ? { name: names[normalizedMethod], id: decodeURIComponent(item[1]) } : null;
}

function body(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Le corps doit être un objet JSON.');
  return value;
}

function response(statusCode, bodyValue) {
  return Object.freeze({ statusCode, headers: JSON_HEADERS, body: serialize(bodyValue) });
}

function serialize(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof value.toJSON === 'function') return serialize(value.toJSON());
  if (Array.isArray(value)) return value.map(serialize);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
}
