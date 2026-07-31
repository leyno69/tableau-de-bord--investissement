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
    <label class="field"><span>Importer Trade Republic ou JSON</span><input id="transactionImportFile" type="file" accept="text/csv,.csv,application/json,.json" /></label>
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
    marketDataState.innerHTML = `<div class="alert"><strong>Connexion serveur</strong><small>${escapeHtml(error.message)}</small></div>`;
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
      <div class="alert"><strong>${escapeHtml(portfolioSelect.selectedOptions[0]?.textContent || portfolioId)}</strong><small>${state?.transactions?.length ?? 0} transaction(s) • ${alerts?.length ?? 0} alerte(s)</small></div>
      <div class="alert"><strong>Données de marché</strong><small>${escapeHtml(marketLabel)}</small></div>`;
    setStatus((state?.transactions?.length ?? 0) > 0 ? 'Synchronisé' : 'Portefeuille prêt');
  } catch (error) {
    setStatus(error.status === 401 ? 'Token requis' : 'Erreur de synchronisation', false);
    marketDataState.innerHTML = `<div class="alert"><strong>Synchronisation</strong><small>${escapeHtml(error.message)}</small></div>`;
  }
}

async function importTransactions() {
  const portfolioId = portfolioSelect.value;
  const file = document.querySelector('#transactionImportFile').files[0];
  if (!portfolioId || !file) return setStatus('Fichier requis', false);

  setStatus('Lecture du fichier…');
  try {
    const text = await file.text();
    let transactions;
    let sourceLabel;
    let skippedBeforeImport = 0;

    if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
      const rows = parseCsv(text);
      if (!isTradeRepublicCsv(rows)) throw new Error('Ce CSV ne correspond pas au format Trade Republic attendu.');
      await ensureTradeRepublicAccounts(portfolioId, rows);
      const mapped = rows.map(row => mapTradeRepublicTransaction(row, portfolioId));
      transactions = mapped.filter(Boolean);
      skippedBeforeImport = mapped.length - transactions.length;
      sourceLabel = 'Trade Republic';
    } else {
      const parsed = JSON.parse(text);
      transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
      sourceLabel = 'JSON';
    }

    if (!Array.isArray(transactions) || !transactions.length) throw new Error('Aucune transaction valide dans ce fichier.');

    setStatus(`Import de ${transactions.length} transaction(s)…`);
    const result = await client.importTransactions(portfolioId, transactions);
    const imported = result?.imported?.length ?? 0;
    const errors = result?.errors ?? [];
    const rejected = errors.length + skippedBeforeImport;
    setStatus(`${imported} importée(s)${rejected ? ` • ${rejected} ignorée(s)` : ''}`, rejected === 0);

    const errorPreview = errors.slice(0, 3)
      .map(error => `Ligne ${Number(error.index) + 2} : ${error.message}`)
      .join(' • ');
    marketDataState.innerHTML = `
      <div class="alert"><strong>Import ${escapeHtml(sourceLabel)}</strong><small>${imported} transaction(s) enregistrée(s)${rejected ? ` • ${rejected} ligne(s) ignorée(s)` : ''}</small></div>
      ${errorPreview ? `<div class="alert"><strong>Détails</strong><small>${escapeHtml(errorPreview)}</small></div>` : ''}`;
    await synchronize();
  } catch (error) {
    setStatus('Import impossible', false);
    marketDataState.innerHTML = `<div class="alert"><strong>Import</strong><small>${escapeHtml(error.message)}</small></div>`;
    console.error('Échec de l’import.', error);
  }
}

async function ensureTradeRepublicAccounts(portfolioId, rows) {
  const existing = await client.listAccounts(portfolioId);
  const existingIds = new Set(existing.map(account => account.id));
  const accountTypes = new Set(rows.map(row => String(row.account_type || '').toUpperCase()).filter(Boolean));
  const definitions = [
    {
      accountType: 'DEFAULT', id: 'trade-republic-cto', name: 'Trade Republic — Compte-titres',
      providerId: 'trade-republic', kind: 'SECURITIES', taxWrapper: 'CTO', currency: 'EUR', status: 'ACTIVE',
      externalId: 'DEFAULT', metadata: { broker: 'Trade Republic', importedFrom: 'transactions-csv' }
    },
    {
      accountType: 'PEA', id: 'trade-republic-pea', name: 'Trade Republic — PEA',
      providerId: 'trade-republic', kind: 'SECURITIES', taxWrapper: 'PEA', currency: 'EUR', status: 'ACTIVE',
      externalId: 'PEA', metadata: { broker: 'Trade Republic', importedFrom: 'transactions-csv' }
    }
  ];

  for (const definition of definitions) {
    if (!accountTypes.has(definition.accountType) || existingIds.has(definition.id)) continue;
    const { accountType, ...account } = definition;
    await client.createAccount(portfolioId, account);
    existingIds.add(definition.id);
  }
}

function mapTradeRepublicTransaction(row, portfolioId) {
  const brokerType = String(row.type || '').toUpperCase();
  const accountType = String(row.account_type || '').toUpperCase();
  const accountId = accountType === 'PEA' ? 'trade-republic-pea' : 'trade-republic-cto';
  const id = String(row.transaction_id || '').trim();
  const executedAt = String(row.datetime || row.date || '').trim();
  const currency = String(row.currency || 'EUR').trim().toUpperCase();
  const fees = absoluteNumber(row.fee);
  const taxes = absoluteNumber(row.tax);
  const base = {
    id: id || `trade-republic-${executedAt}-${Math.random().toString(36).slice(2)}`,
    portfolioId,
    accountId,
    context: 'REAL',
    fees,
    taxes,
    currency,
    executedAt,
    status: 'confirmed',
    createdAt: executedAt
  };

  if (brokerType === 'BUY' || brokerType === 'SELL') {
    const assetId = String(row.symbol || '').trim().toUpperCase();
    const quantity = absoluteNumber(row.shares);
    const unitPrice = absoluteNumber(row.price);
    if (!assetId || quantity <= 0 || unitPrice <= 0) return null;
    return { ...base, assetId, type: brokerType.toLowerCase(), quantity, unitPrice, amount: null };
  }

  const cashTypes = new Map([
    ['CUSTOMER_INPAYMENT', 'deposit'], ['TRANSFER_INSTANT_INBOUND', 'deposit'],
    ['TRANSFER_IN', 'deposit'], ['REFERRAL', 'deposit'], ['PEA_MARKETING', 'deposit'],
    ['TRANSFER_OUT', 'withdrawal']
  ]);
  const type = cashTypes.get(brokerType);
  const amount = absoluteNumber(row.amount);
  if (!type || amount <= 0) return null;
  return { ...base, assetId: null, type, quantity: 0, unitPrice: 0, amount };
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { record.push(field); field = ''; }
    else if (char === '\n') { record.push(field.replace(/\r$/, '')); records.push(record); record = []; field = ''; }
    else field += char;
  }
  if (field.length || record.length) { record.push(field.replace(/\r$/, '')); records.push(record); }
  if (records.length < 2) return [];

  const headers = records[0].map(header => header.trim());
  return records.slice(1)
    .filter(values => values.some(value => value.trim() !== ''))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function isTradeRepublicCsv(rows) {
  if (!rows.length) return false;
  const first = rows[0];
  return ['datetime', 'account_type', 'category', 'type', 'amount', 'transaction_id'].every(field => Object.hasOwn(first, field));
}

function absoluteNumber(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

document.querySelector('#syncBackend').addEventListener('click', synchronize);
document.querySelector('#importTransactions').addEventListener('click', importTransactions);
portfolioSelect.addEventListener('change', synchronize);
window.addEventListener('portfolio-server-ready', () => loadPortfolios({ retry: false }), { once: true });

loadPortfolios();
