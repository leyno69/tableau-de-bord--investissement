import { PortfolioApiClient } from './ui/PortfolioApiClient.js';

const PORTFOLIO_ID_KEY = 'invest-dashboard-server-portfolio-id';
const LEGACY_API_URL_KEY = 'invest-dashboard-api-url';
localStorage.removeItem(LEGACY_API_URL_KEY);

const client = new PortfolioApiClient({ baseUrl: '' });
const controls = document.createElement('section');
controls.className = 'panel backend-panel';
controls.innerHTML = `
  <div class="panel-head">
    <div><p class="eyebrow">DONNÉES SERVEUR</p><h2>Synchronisation</h2></div>
    <span id="backendStatus" class="badge">Connexion…</span>
  </div>
  <div class="form-grid">
    <label class="field"><span>Portefeuille</span><select id="backendPortfolio"></select></label>
    <label class="field"><span>Importer des transactions JSON</span><input id="transactionImportFile" type="file" accept="application/json,.json" /></label>
  </div>
  <div class="dialog-actions">
    <button id="syncBackend" type="button" class="btn">Synchroniser</button>
    <button id="importTransactions" type="button" class="btn secondary">Importer</button>
  </div>
  <div id="marketDataState" class="alerts-list"></div>`;

document.querySelector('.shell')?.prepend(controls);
const status = document.querySelector('#backendStatus');
const portfolioSelect = document.querySelector('#backendPortfolio');
const marketDataState = document.querySelector('#marketDataState');

function setStatus(label, ok = true) {
  status.textContent = label;
  status.className = `badge ${ok ? 'buy' : 'sell'}`;
}

async function loadPortfolios({ retry = true } = {}) {
  setStatus('Connexion…');
  try {
    const portfolios = await client.listPortfolios();
    portfolioSelect.innerHTML = '';
    for (const portfolio of portfolios) portfolioSelect.add(new Option(portfolio.name, portfolio.id));

    if (!portfolios.length) {
      portfolioSelect.add(new Option('Aucun portefeuille', ''));
      setStatus('Aucun portefeuille', false);
      return;
    }

    const remembered = localStorage.getItem(PORTFOLIO_ID_KEY);
    if (remembered && portfolios.some(portfolio => portfolio.id === remembered)) portfolioSelect.value = remembered;
    if (!portfolioSelect.value) portfolioSelect.value = portfolios[0].id;
    localStorage.setItem(PORTFOLIO_ID_KEY, portfolioSelect.value);

    setStatus(`API disponible • ${portfolios.length} portefeuille${portfolios.length > 1 ? 's' : ''}`);
    window.dispatchEvent(new CustomEvent('portfolio-server-ready', { detail: { count: portfolios.length } }));
    await synchronize();
  } catch (error) {
    if (retry) {
      window.setTimeout(() => loadPortfolios({ retry: false }), 800);
      return;
    }
    portfolioSelect.innerHTML = '<option value="">Connexion impossible</option>';
    setStatus(error.status === 401 ? 'Token requis' : 'API indisponible', false);
    marketDataState.innerHTML = `<div class="alert"><strong>Connexion serveur</strong><small>${error.message}</small></div>`;
    console.error('Échec de chargement des portefeuilles.', error);
  }
}

async function synchronize() {
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return setStatus('Aucun portefeuille', false);

  localStorage.setItem(PORTFOLIO_ID_KEY, portfolioId);
  setStatus('Synchronisation…');
  try {
    const [state, alerts] = await Promise.all([
      client.loadPortfolio(portfolioId),
      client.listAlerts(portfolioId)
    ]);

    let marketLabel = 'Non calculées';
    try {
      const dashboard = await client.loadDashboard(portfolioId);
      const market = dashboard?.marketData ?? dashboard?.valuation?.marketData ?? {};
      marketLabel = market.complete === false ? 'Partielles' : 'Complètes';
      if (market.staleCount) marketLabel += ` • ${market.staleCount} périmée(s)`;
    } catch {
      marketLabel = 'En attente de transactions';
    }

    marketDataState.innerHTML = `
      <div class="alert"><strong>${portfolioSelect.selectedOptions[0]?.textContent || portfolioId}</strong><small>${state?.transactions?.length ?? 0} transaction(s) • ${alerts?.length ?? 0} alerte(s)</small></div>
      <div class="alert"><strong>Données de marché</strong><small>${marketLabel}</small></div>`;
    setStatus((state?.transactions?.length ?? 0) > 0 ? 'Synchronisé' : 'Portefeuille prêt');
  } catch (error) {
    setStatus(error.status === 401 ? 'Token requis' : 'Erreur de synchronisation', false);
    marketDataState.innerHTML = `<div class="alert"><strong>Synchronisation</strong><small>${error.message}</small></div>`;
  }
}

async function importTransactions() {
  const portfolioId = portfolioSelect.value;
  const file = document.querySelector('#transactionImportFile').files[0];
  if (!portfolioId || !file) return setStatus('Fichier requis', false);

  try {
    const parsed = JSON.parse(await file.text());
    const transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
    if (!Array.isArray(transactions) || !transactions.length) throw new Error('Aucune transaction valide dans ce fichier.');
    const result = await client.importTransactions(portfolioId, transactions);
    setStatus(`${result.imported.length} importée(s)${result.errors.length ? `, ${result.errors.length} erreur(s)` : ''}`, result.errors.length === 0);
    await synchronize();
  } catch (error) {
    setStatus(error.message, false);
  }
}

document.querySelector('#syncBackend').addEventListener('click', synchronize);
document.querySelector('#importTransactions').addEventListener('click', importTransactions);
portfolioSelect.addEventListener('change', synchronize);
window.addEventListener('portfolio-server-ready', () => loadPortfolios({ retry: false }), { once: true });

loadPortfolios();
