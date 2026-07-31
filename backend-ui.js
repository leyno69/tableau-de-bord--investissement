import { PortfolioApiClient } from './ui/PortfolioApiClient.js';

const client = new PortfolioApiClient({ baseUrl: localStorage.getItem('invest-dashboard-api-url') || '' });
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
    <button id="saveApiUrl" class="btn secondary">Enregistrer l’URL</button>
    <button id="syncBackend" class="btn">Synchroniser</button>
    <button id="importTransactions" class="btn secondary">Importer</button>
  </div>
  <div id="marketDataState" class="alerts-list"></div>`;

document.querySelector('.shell')?.prepend(controls);
const status = document.querySelector('#backendStatus');
const portfolioSelect = document.querySelector('#backendPortfolio');
const apiInput = document.querySelector('#backendApiUrl');
apiInput.value = localStorage.getItem('invest-dashboard-api-url') || '';

function setStatus(label, ok = true) {
  status.textContent = label;
  status.className = `badge ${ok ? 'buy' : 'sell'}`;
}

async function loadPortfolios() {
  try {
    const portfolios = await client.listPortfolios();
    portfolioSelect.innerHTML = '';
    for (const portfolio of portfolios) portfolioSelect.add(new Option(portfolio.name, portfolio.id));
    if (!portfolios.length) portfolioSelect.add(new Option('Aucun portefeuille', ''));
    setStatus('API disponible');
  } catch (error) {
    portfolioSelect.innerHTML = '<option value="">Mode local</option>';
    setStatus('Mode local', false);
    console.info('Backend indisponible, conservation du mode local.', error);
  }
}

async function synchronize() {
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return setStatus('Aucun portefeuille', false);
  setStatus('Synchronisation…');
  try {
    const [state, dashboard, alerts] = await Promise.all([
      client.loadPortfolio(portfolioId), client.loadDashboard(portfolioId), client.listAlerts(portfolioId)
    ]);
    const market = dashboard.marketData ?? dashboard.valuation?.marketData ?? {};
    document.querySelector('#marketDataState').innerHTML = `
      <div class="alert"><strong>Portefeuille ${portfolioId}</strong><small>${state.transactions?.length ?? 0} transaction(s) • ${alerts.length} alerte(s)</small></div>
      <div class="alert"><strong>Données de marché</strong><small>${market.complete === false ? 'Partielles' : 'Complètes'}${market.staleCount ? ` • ${market.staleCount} périmée(s)` : ''}</small></div>`;
    setStatus('Synchronisé');
  } catch (error) {
    setStatus(error.code ?? 'Erreur API', false);
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
  localStorage.setItem('invest-dashboard-api-url', apiInput.value.trim().replace(/\/$/, ''));
  window.location.reload();
});
document.querySelector('#syncBackend').addEventListener('click', synchronize);
document.querySelector('#importTransactions').addEventListener('click', importTransactions);

loadPortfolios();
