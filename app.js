import { brokers } from './brokers.js';
import { defaultPortfolio, summarizePortfolio, allocationByRegion } from './portfolio.js';
import { defaultWatchlist, pseudoRefresh } from './market.js';
import { buildAlerts } from './alerts.js';

const STORAGE_KEYS = {
  portfolio: 'invest-dashboard-portfolio',
  watchlist: 'invest-dashboard-watchlist',
  broker: 'invest-dashboard-active-broker'
};

const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const state = {
  portfolio: load(STORAGE_KEYS.portfolio, defaultPortfolio),
  watchlist: load(STORAGE_KEYS.watchlist, defaultWatchlist),
  activeBroker: localStorage.getItem(STORAGE_KEYS.broker) || 'all'
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEYS.portfolio, JSON.stringify(state.portfolio));
  localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(state.watchlist));
  localStorage.setItem(STORAGE_KEYS.broker, state.activeBroker);
}

function brokerName(id) {
  return brokers.find(b => b.id === id)?.name || id;
}

function visiblePositions() {
  return state.activeBroker === 'all' ? state.portfolio.positions : state.portfolio.positions.filter(p => p.broker === state.activeBroker);
}

function renderBrokerControls() {
  const selects = [document.querySelector('#brokerSelect'), document.querySelector('#positionBroker')];
  for (const [index, select] of selects.entries()) {
    select.innerHTML = '';
    if (index === 0) select.add(new Option('Tous les courtiers', 'all'));
    brokers.forEach(b => select.add(new Option(b.name, b.id)));
  }
  document.querySelector('#brokerSelect').value = state.activeBroker;

  document.querySelector('#brokersPanel').innerHTML = brokers.map(b => `
    <div class="broker-row">
      <div><strong>${b.name}</strong><small>${b.fractional}</small></div>
      <span class="badge">${b.status}</span>
    </div>`).join('');
}

function renderMetrics() {
  const filtered = { ...state.portfolio, positions: visiblePositions() };
  const summary = summarizePortfolio(filtered);
  document.querySelector('#portfolioValue').textContent = money.format(summary.totalValue);
  document.querySelector('#investedValue').textContent = money.format(summary.invested);
  document.querySelector('#pnlValue').textContent = money.format(summary.pnl);
  document.querySelector('#pnlValue').className = summary.pnl >= 0 ? 'positive' : 'negative';
  document.querySelector('#pnlPercent').textContent = pct.format(summary.pnlPct / 100);
  document.querySelector('#cashValue').textContent = money.format(state.portfolio.cash);
  document.querySelector('#portfolioMove').textContent = `${summary.pnl >= 0 ? '+' : ''}${money.format(summary.pnl)} latent`;
}

function renderPortfolio() {
  const rows = visiblePositions();
  const table = document.querySelector('#portfolioTable');
  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="7" class="empty">Aucune position pour ce courtier.</td></tr>';
    return;
  }
  table.innerHTML = rows.map(p => {
    const invested = p.quantity * p.avgPrice;
    const value = p.quantity * p.price;
    const perf = invested ? (value - invested) / invested : 0;
    return `<tr>
      <td class="asset-cell"><strong>${p.name}</strong><small>${p.ticker} • ${p.type}</small></td>
      <td>${brokerName(p.broker)}</td>
      <td>${p.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 6 })}</td>
      <td>${money.format(p.avgPrice)}</td>
      <td>${money.format(p.price)}</td>
      <td>${money.format(value)}</td>
      <td class="${perf >= 0 ? 'positive' : 'negative'}">${pct.format(perf)}</td>
    </tr>`;
  }).join('');
}

function renderAllocation() {
  const filtered = { ...state.portfolio, positions: visiblePositions() };
  const allocations = allocationByRegion(filtered);
  document.querySelector('#allocationBars').innerHTML = allocations.length ? allocations.map(a => `
    <div class="allocation-row">
      <div class="allocation-meta"><span>${a.label}</span><strong>${a.percent.toFixed(1)} %</strong></div>
      <div class="bar"><span style="width:${Math.max(2, a.percent)}%"></span></div>
    </div>`).join('') : '<p class="empty">Aucune donnée.</p>';
}

function signalClass(signal) {
  if (signal === 'Achat') return 'buy';
  if (signal === 'Alléger') return 'sell';
  return '';
}

function renderWatchlist() {
  document.querySelector('#watchlist').innerHTML = state.watchlist.map(item => `
    <article class="watch-card">
      <div class="watch-card-top">
        <div><h3>${item.name}</h3><span class="ticker">${item.ticker}</span></div>
        <span class="badge ${signalClass(item.signal)}">${item.signal}</span>
      </div>
      <div class="watch-price">${money.format(item.price)}</div>
      <div class="${item.change >= 0 ? 'positive' : 'negative'}">${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} % aujourd’hui</div>
      <p class="watch-note">${item.note || '—'}</p>
    </article>`).join('');
}

function renderAlerts() {
  const alerts = buildAlerts(state.watchlist);
  document.querySelector('#alertsList').innerHTML = alerts.map(a => `
    <div class="alert"><strong>${a.title}</strong><small>${a.text}</small></div>`).join('');
}

function renderAll() {
  renderMetrics();
  renderPortfolio();
  renderAllocation();
  renderWatchlist();
  renderAlerts();
}

function setupDialogs() {
  const positionDialog = document.querySelector('#positionDialog');
  const watchDialog = document.querySelector('#watchDialog');
  const positionForm = document.querySelector('#positionForm');
  const watchForm = document.querySelector('#watchForm');

  document.querySelector('#addPositionBtn').addEventListener('click', () => positionDialog.showModal());
  document.querySelector('#addWatchBtn').addEventListener('click', () => watchDialog.showModal());

  document.querySelector('#savePositionBtn').addEventListener('click', (event) => {
    event.preventDefault();
    if (!positionForm.reportValidity()) return;
    const data = new FormData(positionForm);
    state.portfolio.positions.push({
      id: Date.now(),
      name: String(data.get('name')).trim(),
      ticker: String(data.get('ticker')).trim().toUpperCase(),
      type: String(data.get('type')),
      broker: String(data.get('broker')),
      quantity: Number(data.get('quantity')),
      avgPrice: Number(data.get('avgPrice')),
      price: Number(data.get('price')),
      region: String(data.get('region'))
    });
    persist();
    renderAll();
    positionForm.reset();
    positionDialog.close();
  });

  document.querySelector('#saveWatchBtn').addEventListener('click', (event) => {
    event.preventDefault();
    if (!watchForm.reportValidity()) return;
    const data = new FormData(watchForm);
    state.watchlist.push({
      id: Date.now(),
      name: String(data.get('name')).trim(),
      ticker: String(data.get('ticker')).trim().toUpperCase(),
      price: Number(data.get('price')),
      change: Number(data.get('change')),
      signal: String(data.get('signal')),
      note: String(data.get('note')).trim()
    });
    persist();
    renderAll();
    watchForm.reset();
    watchDialog.close();
  });
}

renderBrokerControls();
renderAll();
setupDialogs();

document.querySelector('#brokerSelect').addEventListener('change', (event) => {
  state.activeBroker = event.target.value;
  persist();
  renderAll();
});

document.querySelector('#refreshBtn').addEventListener('click', () => {
  state.watchlist = pseudoRefresh(state.watchlist);
  state.portfolio.positions = state.portfolio.positions.map(p => ({
    ...p,
    price: Number((p.price * (1 + (Math.random() - 0.5) * 0.008)).toFixed(2))
  }));
  persist();
  renderAll();
});
