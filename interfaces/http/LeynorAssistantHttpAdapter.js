const JSON_HEADERS = Object.freeze({ 'content-type': 'application/json; charset=utf-8' });

export class LeynorAssistantHttpAdapter {
  constructor({ assistantService = null } = {}) {
    if (assistantService != null && typeof assistantService.answer !== 'function') {
      throw new TypeError('assistantService doit exposer answer().');
    }
    this.assistantService = assistantService;
    Object.freeze(this);
  }

  async handle(request) {
    if (!request || request.method !== 'POST' || request.path !== '/leynor/assistant/answer') return null;
    if (this.assistantService == null) {
      return LeynorAssistantHttpAdapter.#response(503, {
        error: {
          code: 'LEYNOR_AI_NOT_CONFIGURED',
          message: 'Le fournisseur IA de LEYNOR n’est pas configuré.'
        }
      });
    }

    try {
      const body = request.body == null ? {} : request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new TypeError('Le corps de la requête doit être un objet JSON.');
      }
      const data = await this.assistantService.answer(body);
      return LeynorAssistantHttpAdapter.#response(200, { data });
    } catch (error) {
      const providerFailure = error instanceof Error && /fournisseur IA|fetch|abort|timeout/i.test(error.message);
      return LeynorAssistantHttpAdapter.#response(providerFailure ? 502 : 400, {
        error: {
          code: providerFailure ? 'LEYNOR_AI_PROVIDER_FAILURE' : 'INVALID_LEYNOR_ASSISTANT_REQUEST',
          message: error instanceof Error ? error.message : 'Impossible de produire la réponse LEYNOR.'
        }
      });
    }
  }

  static #response(statusCode, body) {
    return Object.freeze({ statusCode, headers: JSON_HEADERS, body });
  }
}
