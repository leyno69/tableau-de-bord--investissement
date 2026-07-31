const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class LeynorAnalysisHttpAdapter {
  constructor({ pipeline }) {
    if (!pipeline || typeof pipeline.prepare !== 'function') throw new TypeError('pipeline doit exposer prepare().');
    this.pipeline = pipeline;
    Object.freeze(this);
  }

  async handle(request) {
    if (!request || request.method !== 'POST' || request.path !== '/leynor/analysis/prepare') return null;
    try {
      const body = request.body == null ? {} : request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Le corps de la requête doit être un objet JSON.');
      return LeynorAnalysisHttpAdapter.#response(200, { data: this.pipeline.prepare(body) });
    } catch (error) {
      return LeynorAnalysisHttpAdapter.#response(400, {
        error: {
          code: 'INVALID_LEYNOR_ANALYSIS_REQUEST',
          message: error instanceof Error ? error.message : 'Requête LEYNOR invalide.'
        }
      });
    }
  }

  static #response(statusCode, body) {
    return Object.freeze({ statusCode, headers: JSON_HEADERS, body });
  }
}
