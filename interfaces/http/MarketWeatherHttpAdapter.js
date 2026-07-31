const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class MarketWeatherHttpAdapter {
  constructor({ marketWeatherService }) {
    if (!marketWeatherService || typeof marketWeatherService.evaluate !== 'function') {
      throw new TypeError('marketWeatherService doit exposer evaluate().');
    }
    this.marketWeatherService = marketWeatherService;
    Object.freeze(this);
  }

  async handle(request) {
    try {
      const normalized = MarketWeatherHttpAdapter.#request(request);
      if (normalized.method !== 'POST' || !/^\/leynor\/market-weather\/?$/.test(normalized.path)) return null;
      const input = MarketWeatherHttpAdapter.#body(normalized.body);
      const report = this.marketWeatherService.evaluate(input);
      return MarketWeatherHttpAdapter.#response(200, { data: report.toJSON() });
    } catch (error) {
      return MarketWeatherHttpAdapter.#failure(error);
    }
  }

  static #request(request) {
    if (!request || typeof request !== 'object') throw new TypeError('request est obligatoire.');
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : '';
    const path = typeof request.path === 'string' ? request.path : '';
    return { method, path, body: request.body };
  }

  static #body(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Le corps JSON doit être un objet.');
    return body;
  }

  static #response(statusCode, body) {
    return Object.freeze({ statusCode, headers: JSON_HEADERS, body });
  }

  static #failure(error) {
    const clientError = error instanceof TypeError || error instanceof RangeError;
    return MarketWeatherHttpAdapter.#response(clientError ? 400 : 500, {
      error: {
        code: clientError ? 'INVALID_MARKET_WEATHER_INPUT' : 'MARKET_WEATHER_FAILURE',
        message: clientError ? error.message : 'Impossible de calculer la météo des marchés.'
      }
    });
  }
}
