const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class PortfolioHttpAdapter {
  constructor({ facade, adminService = null }) {
    for (const method of ['recordTransaction', 'savePreferences', 'loadPortfolio', 'generateDashboard']) {
      if (!facade || typeof facade[method] !== 'function') throw new TypeError(`facade doit implémenter ${method}().`);
    }
    if (adminService != null) {
      for (const method of ['savePortfolio', 'listPortfolios', 'saveAccount', 'listAccounts', 'importTransactions']) {
        if (typeof adminService[method] !== 'function') throw new TypeError(`adminService doit implémenter ${method}().`);
      }
    }
    this.facade = facade;
    this.adminService = adminService;
  }

  async handle(request) {
    try {
      const normalized = PortfolioHttpAdapter.#request(request);
      const route = PortfolioHttpAdapter.#match(normalized.method, normalized.path);
      if (!route) return PortfolioHttpAdapter.#response(404, { error: { code: 'ROUTE_NOT_FOUND', message: 'Route introuvable.' } });
      if (route.admin && this.adminService == null) return PortfolioHttpAdapter.#response(501, { error: { code: 'ADMIN_API_DISABLED', message: "L'API d'administration n'est pas configurée." } });
      const result = await this.#dispatch(route, normalized);
      return PortfolioHttpAdapter.#response(result.statusCode, result.body);
    } catch (error) {
      return PortfolioHttpAdapter.#failure(error);
    }
  }

  async #dispatch(route, request) {
    const portfolioId = route.portfolioId ?? request.query.portfolioId;
    switch (route.name) {
      case 'createPortfolio': {
        const portfolio = await this.adminService.savePortfolio(PortfolioHttpAdapter.#body(request.body));
        return { statusCode: 201, body: { data: portfolio } };
      }
      case 'updatePortfolio': {
        const portfolio = await this.adminService.savePortfolio({ ...PortfolioHttpAdapter.#body(request.body), id: portfolioId });
        return { statusCode: 200, body: { data: portfolio } };
      }
      case 'listPortfolios': return { statusCode: 200, body: { data: await this.adminService.listPortfolios() } };
      case 'createAccount': {
        const account = await this.adminService.saveAccount({ ...PortfolioHttpAdapter.#body(request.body), portfolioId });
        return { statusCode: 201, body: { data: account } };
      }
      case 'listAccounts': return { statusCode: 200, body: { data: await this.adminService.listAccounts(portfolioId) } };
      case 'importTransactions': {
        const body = PortfolioHttpAdapter.#body(request.body);
        const result = await this.adminService.importTransactions(portfolioId, body.transactions);
        return { statusCode: result.complete ? 201 : 207, body: { data: result } };
      }
      case 'recordTransaction': {
        const transaction = await this.facade.recordTransaction({ ...PortfolioHttpAdapter.#body(request.body), portfolioId });
        return { statusCode: 201, body: { data: transaction } };
      }
      case 'savePreferences': {
        const preferences = await this.facade.savePreferences({ ...PortfolioHttpAdapter.#body(request.body), portfolioId });
        return { statusCode: 200, body: { data: preferences } };
      }
      case 'valuation': {
        PortfolioHttpAdapter.#facadeMethod(this.facade, 'valuePortfolioAt');
        return { statusCode: 200, body: { data: await this.facade.valuePortfolioAt({ portfolioId, date: request.query.date, marketDataPolicy: request.query.marketDataPolicy ?? 'strict' }) } };
      }
      case 'valuationHistory': {
        PortfolioHttpAdapter.#facadeMethod(this.facade, 'loadValuationHistory');
        return { statusCode: 200, body: { data: await this.facade.loadValuationHistory({ portfolioId, from: request.query.from, to: request.query.to, marketDataPolicy: request.query.marketDataPolicy ?? 'partial' }) } };
      }
      case 'loadPortfolio': return { statusCode: 200, body: { data: await this.facade.loadPortfolio(portfolioId) } };
      case 'listAlerts': {
        const state = await this.facade.loadPortfolio(portfolioId);
        return { statusCode: 200, body: { data: state.alerts ?? [] } };
      }
      case 'performance': {
        const dashboard = await this.facade.generateDashboard({ portfolioId, marketDataPolicy: 'partial' });
        return { statusCode: 200, body: { data: dashboard.performance ?? dashboard.analytics ?? null } };
      }
      case 'generateDashboard': {
        const body = request.body == null ? {} : PortfolioHttpAdapter.#body(request.body);
        const dashboard = await this.facade.generateDashboard({
          portfolioId,
          marketDataPolicy: body.marketDataPolicy ?? 'partial',
          ...(Object.hasOwn(body, 'marketQuotes') ? { marketQuotes: body.marketQuotes } : {})
        });
        return { statusCode: 200, body: { data: dashboard } };
      }
      default: throw new Error(`Route non prise en charge : ${route.name}`);
    }
  }

  static #match(method, path) {
    const patterns = [
      ['GET', /^\/portfolio\/valuation\/?$/, 'valuation', false],
      ['GET', /^\/portfolio\/history\/?$/, 'valuationHistory', false],
      ['GET', /^\/portfolios\/([^/]+)\/valuation\/?$/, 'valuation', false],
      ['GET', /^\/portfolios\/([^/]+)\/history\/?$/, 'valuationHistory', false],
      ['POST', /^\/portfolios\/?$/, 'createPortfolio', true],
      ['GET', /^\/portfolios\/?$/, 'listPortfolios', true],
      ['PUT', /^\/portfolios\/([^/]+)\/?$/, 'updatePortfolio', true],
      ['POST', /^\/portfolios\/([^/]+)\/accounts\/?$/, 'createAccount', true],
      ['GET', /^\/portfolios\/([^/]+)\/accounts\/?$/, 'listAccounts', true],
      ['POST', /^\/portfolios\/([^/]+)\/transactions\/import\/?$/, 'importTransactions', true],
      ['POST', /^\/portfolios\/([^/]+)\/transactions\/?$/, 'recordTransaction', false],
      ['PUT', /^\/portfolios\/([^/]+)\/preferences\/?$/, 'savePreferences', false],
      ['GET', /^\/portfolios\/([^/]+)\/alerts\/?$/, 'listAlerts', false],
      ['GET', /^\/portfolios\/([^/]+)\/performance\/?$/, 'performance', false],
      ['GET', /^\/portfolios\/([^/]+)\/?$/, 'loadPortfolio', false],
      ['POST', /^\/portfolios\/([^/]+)\/dashboard\/?$/, 'generateDashboard', false]
    ];
    for (const [expectedMethod, pattern, name, admin] of patterns) {
      if (method !== expectedMethod) continue;
      const match = path.match(pattern);
      if (match) return Object.freeze({ name, admin, portfolioId: match[1] == null ? null : decodeURIComponent(match[1]) });
    }
    return null;
  }

  static #request(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('request doit être un objet.');
    if (typeof value.method !== 'string' || value.method.trim() === '') throw new TypeError('request.method est obligatoire.');
    if (typeof value.path !== 'string' || value.path.trim() === '') throw new TypeError('request.path est obligatoire.');
    const url = new URL(value.path.trim(), 'http://localhost');
    return Object.freeze({ method: value.method.trim().toUpperCase(), path: url.pathname, query: Object.freeze(Object.fromEntries(url.searchParams.entries())), body: value.body ?? null });
  }

  static #body(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Le corps de la requête doit être un objet JSON.');
    return value;
  }

  static #facadeMethod(facade, method) {
    if (typeof facade[method] !== 'function') throw new Error("Le moteur de valorisation historique n'est pas configuré.");
  }

  static #response(statusCode, body) {
    return Object.freeze({ statusCode, headers: JSON_HEADERS, body: PortfolioHttpAdapter.#serialize(body) });
  }

  static #failure(error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    if (/existe déjà|contenu différent/i.test(message)) return PortfolioHttpAdapter.#response(409, { error: { code: 'CONFLICT', message } });
    if (/Aucune préférence|introuvable|n'existe pas/i.test(message)) return PortfolioHttpAdapter.#response(404, { error: { code: 'NOT_FOUND', message } });
    if (/n'est pas configuré/i.test(message)) return PortfolioHttpAdapter.#response(501, { error: { code: 'VALUATION_API_DISABLED', message } });
    if (error instanceof TypeError || error instanceof RangeError) return PortfolioHttpAdapter.#response(400, { error: { code: 'INVALID_REQUEST', message } });
    return PortfolioHttpAdapter.#response(500, { error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } });
  }

  static #serialize(value) {
    if (value == null || typeof value !== 'object') return value;
    if (typeof value.toJSON === 'function') return PortfolioHttpAdapter.#serialize(value.toJSON());
    if (Array.isArray(value)) return value.map(item => PortfolioHttpAdapter.#serialize(item));
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, PortfolioHttpAdapter.#serialize(item)]));
  }
}
