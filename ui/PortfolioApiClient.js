const API_TOKEN_KEY = 'invest-dashboard-api-token';

export class PortfolioApiClient {
  constructor({ baseUrl = '', fetchImpl = globalThis.fetch, tokenProvider = () => localStorage.getItem(API_TOKEN_KEY) || '' } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl doit être une fonction.');
    if (typeof tokenProvider !== 'function') throw new TypeError('tokenProvider doit être une fonction.');
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.tokenProvider = tokenProvider;
  }

  listPortfolios() { return this.#request('GET', '/portfolios'); }
  createPortfolio(input) { return this.#request('POST', '/portfolios', input); }
  loadPortfolio(id) { return this.#request('GET', `/portfolios/${encodeURIComponent(id)}`); }
  loadDashboard(id) { return this.#request('POST', `/portfolios/${encodeURIComponent(id)}/dashboard`, { marketDataPolicy: 'partial' }); }
  listAlerts(id) { return this.#request('GET', `/portfolios/${encodeURIComponent(id)}/alerts`); }
  importTransactions(id, transactions) { return this.#request('POST', `/portfolios/${encodeURIComponent(id)}/transactions/import`, { transactions }); }

  async #request(method, path, body) {
    const token = String(this.tokenProvider() || '').trim();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body == null ? {} : { 'content-type': 'application/json' })
      },
      ...(body == null ? {} : { body: JSON.stringify(body) })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 207) {
      const error = new Error(payload?.error?.message ?? `Erreur HTTP ${response.status}`);
      error.code = payload?.error?.code ?? 'HTTP_ERROR';
      error.status = response.status;
      throw error;
    }
    return payload.data;
  }
}
