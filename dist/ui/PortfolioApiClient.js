const API_TOKEN_KEY = 'invest-dashboard-api-token';

function readStoredToken() {
  const storage = globalThis.localStorage;
  return storage && typeof storage.getItem === 'function'
    ? storage.getItem(API_TOKEN_KEY) || ''
    : '';
}

export class PortfolioApiClient {
  constructor({ baseUrl = '', fetchImpl = globalThis.fetch, tokenProvider = readStoredToken } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl doit être une fonction.');
    if (typeof tokenProvider !== 'function') throw new TypeError('tokenProvider doit être une fonction.');
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.fetchImpl = fetchImpl.bind(globalThis);
    this.tokenProvider = tokenProvider;
  }

  listPortfolios() { return this.#request('GET', '/portfolios'); }
  createPortfolio(input) { return this.#request('POST', '/portfolios', input); }
  loadPortfolio(id) { return this.#request('GET', `/portfolios/${encodeURIComponent(id)}`); }
  listAccounts(id) { return this.#request('GET', `/portfolios/${encodeURIComponent(id)}/accounts`); }
  createAccount(id, input) { return this.#request('POST', `/portfolios/${encodeURIComponent(id)}/accounts`, input); }
  loadDashboard(id) { return this.#request('POST', `/portfolios/${encodeURIComponent(id)}/dashboard`, { marketDataPolicy: 'partial' }); }
  listAlerts(id) { return this.#request('GET', `/portfolios/${encodeURIComponent(id)}/alerts`); }
  importTransactions(id, transactions) { return this.#request('POST', `/portfolios/${encodeURIComponent(id)}/transactions/import`, { transactions }); }
  loadPeriodPerformance(id, { date, marketDataPolicy = 'partial' } = {}) { return this.#request('GET', this.#query(`/portfolios/${encodeURIComponent(id)}/performance-periods`, { date, marketDataPolicy })); }
  loadDividends(id, { from, to, baseCurrency = 'EUR' } = {}) { return this.#request('GET', this.#query(`/portfolios/${encodeURIComponent(id)}/dividends`, { from, to, baseCurrency })); }
  loadChartSeries(id, { from, to, marketDataPolicy = 'partial' } = {}) { return this.#request('GET', this.#query(`/portfolios/${encodeURIComponent(id)}/chart-series`, { from, to, marketDataPolicy })); }
  simulateInvestment(input) { return this.#request('POST', '/simulation/investment', input); }
  evaluateGoal(input) { return this.#request('POST', '/goals/evaluate', input); }

  #query(path, parameters) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters)) if (value != null && value !== '') search.set(key, String(value));
    const query = search.toString();
    return query ? `${path}?${query}` : path;
  }

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
