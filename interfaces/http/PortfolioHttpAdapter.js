const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class PortfolioHttpAdapter {
  constructor({ facade }) {
    for (const method of ['recordTransaction', 'savePreferences', 'loadPortfolio', 'generateDashboard']) {
      if (!facade || typeof facade[method] !== 'function') {
        throw new TypeError(`facade doit implémenter ${method}().`);
      }
    }
    this.facade = facade;
  }

  async handle(request) {
    try {
      const normalized = PortfolioHttpAdapter.#request(request);
      const route = PortfolioHttpAdapter.#match(normalized.method, normalized.path);
      if (!route) return PortfolioHttpAdapter.#response(404, { error: { code: 'ROUTE_NOT_FOUND', message: 'Route introuvable.' } });

      const result = await this.#dispatch(route, normalized);
      return PortfolioHttpAdapter.#response(result.statusCode, result.body);
    } catch (error) {
      return PortfolioHttpAdapter.#failure(error);
    }
  }

  async #dispatch(route, request) {
    const portfolioId = route.portfolioId;
    switch (route.name) {
      case 'recordTransaction': {
        const transaction = await this.facade.recordTransaction({
          ...PortfolioHttpAdapter.#body(request.body),
          portfolioId
        });
        return { statusCode: 201, body: { data: transaction } };
      }
      case 'savePreferences': {
        const preferences = await this.facade.savePreferences({
          ...PortfolioHttpAdapter.#body(request.body),
          portfolioId
        });
        return { statusCode: 200, body: { data: preferences } };
      }
      case 'loadPortfolio': {
        const state = await this.facade.loadPortfolio(portfolioId);
        return { statusCode: 200, body: { data: state } };
      }
      case 'generateDashboard': {
        const body = request.body == null ? {} : PortfolioHttpAdapter.#body(request.body);
        const dashboard = await this.facade.generateDashboard({
          portfolioId,
          marketQuotes: body.marketQuotes ?? []
        });
        return { statusCode: 200, body: { data: dashboard } };
      }
      default:
        throw new Error(`Route non prise en charge : ${route.name}`);
    }
  }

  static #match(method, path) {
    const patterns = [
      ['POST', /^\/portfolios\/([^/]+)\/transactions\/?$/, 'recordTransaction'],
      ['PUT', /^\/portfolios\/([^/]+)\/preferences\/?$/, 'savePreferences'],
      ['GET', /^\/portfolios\/([^/]+)\/?$/, 'loadPortfolio'],
      ['POST', /^\/portfolios\/([^/]+)\/dashboard\/?$/, 'generateDashboard']
    ];
    for (const [expectedMethod, pattern, name] of patterns) {
      if (method !== expectedMethod) continue;
      const match = path.match(pattern);
      if (match) return Object.freeze({ name, portfolioId: decodeURIComponent(match[1]) });
    }
    return null;
  }

  static #request(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('request doit être un objet.');
    if (typeof value.method !== 'string' || value.method.trim() === '') throw new TypeError('request.method est obligatoire.');
    if (typeof value.path !== 'string' || value.path.trim() === '') throw new TypeError('request.path est obligatoire.');
    return Object.freeze({
      method: value.method.trim().toUpperCase(),
      path: value.path.trim().split('?')[0],
      body: value.body ?? null
    });
  }

  static #body(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Le corps de la requête doit être un objet JSON.');
    return value;
  }

  static #response(statusCode, body) {
    return Object.freeze({
      statusCode,
      headers: JSON_HEADERS,
      body: PortfolioHttpAdapter.#serialize(body)
    });
  }

  static #failure(error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    if (error instanceof TypeError || error instanceof RangeError) {
      return PortfolioHttpAdapter.#response(400, { error: { code: 'INVALID_REQUEST', message } });
    }
    if (/existe déjà|contenu différent/i.test(message)) {
      return PortfolioHttpAdapter.#response(409, { error: { code: 'CONFLICT', message } });
    }
    if (/Aucune préférence|introuvable|n'existe pas/i.test(message)) {
      return PortfolioHttpAdapter.#response(404, { error: { code: 'NOT_FOUND', message } });
    }
    return PortfolioHttpAdapter.#response(500, {
      error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' }
    });
  }

  static #serialize(value) {
    if (value == null || typeof value !== 'object') return value;
    if (typeof value.toJSON === 'function') return PortfolioHttpAdapter.#serialize(value.toJSON());
    if (Array.isArray(value)) return value.map(item => PortfolioHttpAdapter.#serialize(item));
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, PortfolioHttpAdapter.#serialize(item)])
    );
  }
}
