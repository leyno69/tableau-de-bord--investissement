import { PortfolioApiClient } from './ui/PortfolioApiClient.js';

const API_URL_KEY = 'invest-dashboard-api-url';
const PORTFOLIO_ID_KEY = 'invest-dashboard-server-portfolio-id';
const client = new PortfolioApiClient({ baseUrl: localStorage.getItem(API_URL_KEY) || '' });
const controls = document.createElement('section');
controls.className = 'panel backend-panel';
controls.innerHTML = `
  <div class="panel-head">
    <div><p class="eyebrow">DONNÉES SERVEUR</p><h2>Synchronisation</h2></div>
    <span id="backendStatus" class="badge">Connexion…</span>
  </div>
  <div class="form-grid">
    <label class="field"><span>Portefeuille</span><select id="backendPortfolio"></select></label>
    <label class="field"><span>URL API</span><input id="backendApiUrl" placeholder="Même origine" /></label>
    <label class="field"><span>Importer des transactions JSON</span><input id="transactionImportFile" type="file" accept="application/json,.json" /></label>
  </div>
  <div class="dialog-actions">
    <button id="saveApiUrl" type="button" class="btn secondary">Enregistrer l’URL</button>
    <button id="syncBackend" type="button" class="btn">Synchroniser</button>
    <button id="importTransactions" type="button" class="btn secondary">Importer</button>
  </div>
  <div id="marketDataState" class="alerts-list"></div>`;

document.querySelector('.shell')?.prepend(controls);
const status = document.querySelector('#backendStatus');
const portfolioSelect = document.querySelector('#backendPortfolio');
const apiInput = document.querySelector('#backendApiUrl');
apiInput.value = localStorage.getItem(API_URL_KEY) || '';

function setStatus(label, ok = true) {
  status.textContent = label;
  status.className = `badge ${ok ? 'buy' : 'sell'}`;
}

async function ensurePortfolio(portfolios) {
  if (portfolios.length) return portfolios;
  setStatus('Création du portefeuille…');
  const created = await client.createPortfolio({
    id: 'principal',
    name: 'Portefeuille principal',
    baseCurrency: 'EUR',
    status: 'ACTIVE'
  });
  return [created];
}

async function loadPortfolios() {
  let portfolios;
  try {
    portfolios = await client.listPortfolios();
    portfolios = await ensurePortfolio(portfolios);
  } catch (error) {
    portfolioSelect.innerHTML = '<option value="">Mode local</option>';
    setStatus(error.status === 401 ? 'Token requis' : 'API indisponible', false);
    console.info('Backend indisponible, conservation du mode local.', error);
    return;
  }

  portfolioSelect.innerHTML = '';
  for (const portfolio of portfolios) portfolioSelect.add(new Option(portfolio.name, portfolio.id));

  const remembered = localStorage.getItem(PORTFOLIO_ID_KEY);
  if (remembered && portfolios.some(portfolio => portfolio.id === remembered)) portfolioSelect.value = remembered;
  if (!portfolioSelect.value && portfolios[0]) portfolioSelect.value = portfolios[0].id;
  localStorage.setItem(PORTFOLIO_ID_KEY, portfolioSelect.value);

  setStatus(`API disponible • ${portfolios.length} portefeuille${portfolios.length > 1 ? 's' : ''}`);

  try {
    await synchronize();
  } catch (error) {
    console.info('Portefeuille créé mais encore vide.', error);
  }

  window.dispatchEvent(new CustomEvent('portfolio-server-ready', { detail: { count: portfolios.length } }));
}

async function synchronize() {
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) {
    setStatus('Aucun portefeuille', false);
    return;
  }
  localStorage.setItem(PORTFOLIO_ID_KEY, portfolioId);
  setStatus('Synchronisation…');
  try {
    const [state, dashboard, alerts] = await Promise.all([
      client.loadPortfolio(portfolioId), client.loadDashboard(portfolioId), client.listAlerts(portfolioId)
    ]);
    const market = dashboard.marketData ?? dashboard.valuation?.marketData ?? {};
    document.querySelector('#marketDataState').innerHTML = `
      <div class="alert"><strong>${portfolioSelect.selectedOptions[0]?.textContent || portfolioId}</strong><small>${state.transactions?.length ?? 0} transaction(s) • ${alerts.length} alerte(s)</small></div>
      <div class="alert"><strong>Données de marché</strong><small>${market.complete === false ? 'Partielles' : 'Complètes'}${market.staleCount ? ` • ${market.staleCount} périmée(s)` : ''}</small></div>`;
    setStatus('Synchronisé');
  } catch (error) {
    document.querySelector('#marketDataState').innerHTML = `
      <div class="alert"><strong>${portfolioSelect.selectedOptions[0]?.textContent || portfolioId}</strong><small>Portefeuille créé. Aucune transaction importée pour le moment.</small></div>`;
    setStatus('Portefeuille prêt');
    throw error;
  }
}

async function importTransactions() {
  const portfolioId = portfolioSelect.value;
  const file = document.querySelector('#transactionImportFile').files[0];
  if (!portfolioId || !file) return setStatus('Fichier requis', false);
  try {
    const parsed = JSON.parse(await file.text());
    const transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
    const result = await client.importTransactions(portfolioId, transactions);
    setStatus(`${result.imported.length} importée(s)${result.errors.length ? `, ${result.errors.length} erreur(s)` : ''}`, result.errors.length === 0);
    await synchronize();
  } catch (error) {
    setStatus(error.message, false);
  }
}

document.querySelector('#saveApiUrl').addEventListener('click', () => {
  localStorage.setItem(API_URL_KEY, apiInput.value.trim().replace(/\/$/, ''));
  window.location.reload();
});
document.querySelector('#syncBackend').addEventListener('click', () => synchronize().catch(() => {}));
document.querySelector('#importTransactions').addEventListener('click', importTransactions);
portfolioSelect.addEventListener('change', () => synchronize().catch(() => {}));

loadPortfolios();
