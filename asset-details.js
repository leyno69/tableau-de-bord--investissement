import { fetchQuote, resolveMarketSymbol } from './market.js';

const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const WATCHLIST_KEY = 'invest-dashboard-watchlist';
const GOAL_KEY = 'leynor-long-term-goal';
const HISTORY_KEY = 'leynor-market-history-v1';
const RANGES = ['1H', '1J', '5J', '1S', '1M', '6M', '1A', 'MAX'];
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

if (!document.querySelector('link[data-asset-details]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'asset-details.css';
  link.dataset.assetDetails = 'true';
  document.head.append(link);
}

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function portfolio() { return load(PORTFOLIO_KEY, { cash: 0, positions: [] }); }
function watchlist() { return load(WATCHLIST_KEY, []); }
function history() { return load(HISTORY_KEY, {}); }
function duration(range) { return ({ '1H': 36e5, '1J': 864e5, '5J': 432e6, '1S': 6048e5, '1M': 26298e5, '6M': 157788e5, '1A': 315576e5, MAX: Infinity })[range]; }

function savePoint(symbol, price, at = Date.now()) {
  if (!symbol || !Number.isFinite(Number(price))) return;
  const all = history();
  const points = Array.isArray(all[symbol]) ? all[symbol] : [];
  const last = points.at(-1);
  if (!last || at - last.at > 60000 || Number(last.price) !== Number(price)) points.push({ at, price: Number(price) });
  all[symbol] = points.slice(-3000);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

function pointsFor(symbol, range) {
  const min = Date.now() - duration(range);
  return (history()[symbol] || []).filter(point => point.at >= min);
}

function chart(points) {
  if (points.length < 2) return '<div class="chart-empty">Historique insuffisant. LEYNOR enregistrera de nouveaux points à chaque actualisation.</div>';
  const width = 760, height = 280, values = points.map(point => point.price);
  const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
  const path = points.map((point, index) => {
    const x = index / (points.length - 1) * width;
    const y = height - ((point.price - min) / spread) * (height - 28) - 14;
    return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return `<svg class="market-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du cours"><path class="market-chart__area" d="${path} L ${width} ${height} L 0 ${height} Z"></path><path class="market-chart__line" d="${path}"></path></svg>`;
}

function getDialog() {
  let node = document.getElementById('assetDetailsDialog');
  if (node) return node;
  node = document.createElement('dialog');
  node.id = 'assetDetailsDialog';
  node.className = 'asset-details-dialog';
  node.innerHTML = '<div id="assetDetailsContent"></div>';
  document.body.append(node);
  node.addEventListener('click', event => { if (event.target === node) node.close(); });
  return node;
}

async function openDetails(item, type = 'asset') {
  const modal = getDialog();
  const content = modal.querySelector('#assetDetailsContent');
  const symbol = resolveMarketSymbol(item);
  savePoint(symbol, item.price);
  content.innerHTML = '<div class="asset-details-loading">Chargement du cours…</div>';
  if (!modal.open) modal.showModal();
  let quote = null, error = null;
  if (symbol !== 'PORTFOLIO') {
    try {
      quote = await fetchQuote(symbol);
      savePoint(symbol, quote.price, quote.datetime ? Date.parse(quote.datetime) || Date.now() : Date.now());
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Cours indisponible.'; }
  }
  let activeRange = '1M';
  const render = () => {
    const price = quote?.price ?? item.price;
    const change = quote?.percentChange ?? item.change;
    content.innerHTML = `<header class="asset-details-head"><div><p>${type === 'portfolio' ? 'DÉTAIL DU PORTEFEUILLE' : 'FICHE ACTIF'}</p><h2>${item.name}</h2><span>${symbol}</span></div><button type="button" data-close aria-label="Fermer">×</button></header><section class="asset-quote"><strong>${money.format(Number(price || 0))}</strong><span class="${Number(change) >= 0 ? 'positive' : 'negative'}">${Number.isFinite(Number(change)) ? `${Number(change) >= 0 ? '+' : ''}${Number(change).toFixed(2)} %` : 'Variation indisponible'}</span></section><nav class="chart-ranges">${RANGES.map(range => `<button type="button" data-range="${range}" class="${range === activeRange ? 'active' : ''}">${range}</button>`).join('')}</nav><section class="chart-shell">${chart(pointsFor(symbol, activeRange))}</section><footer class="asset-details-foot"><span>${error || `Dernière donnée : ${quote?.datetime || item.marketUpdatedAt || 'cours enregistré localement'}`}</span><small>Le graphique affiche uniquement les observations réellement enregistrées par LEYNOR.</small></footer>`;
    content.querySelector('[data-close]').addEventListener('click', () => modal.close());
    content.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => { activeRange = button.dataset.range; render(); }));
  };
  render();
}

function editGoal() {
  const card = document.querySelector('.goal-card');
  const value = card?.querySelector('strong');
  if (!card || !value) return;
  const render = () => value.textContent = money.format(Number(localStorage.getItem(GOAL_KEY) || 200000));
  const edit = () => {
    const answer = prompt('Nouvel objectif long terme en euros :', localStorage.getItem(GOAL_KEY) || '200000');
    if (answer == null) return;
    const amount = Number(answer.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return alert('Montant invalide.');
    localStorage.setItem(GOAL_KEY, String(amount));
    render();
  };
  render(); card.tabIndex = 0; card.title = 'Cliquer pour modifier votre objectif'; card.addEventListener('click', edit);
}

function editCash() {
  const value = document.getElementById('cashValue');
  const card = value?.closest('.metric-card');
  if (!card) return;
  const note = card.querySelector('small');
  if (note) note.textContent = 'locales — cliquez pour corriger';
  const edit = () => {
    const data = portfolio();
    const answer = prompt('Liquidités disponibles chez votre courtier :', String(data.cash || 0));
    if (answer == null) return;
    const amount = Number(answer.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) return alert('Montant invalide.');
    data.cash = amount;
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
    location.reload();
  };
  card.tabIndex = 0; card.title = 'Cliquer pour corriger les liquidités locales'; card.addEventListener('click', edit);
}

function init() {
  portfolio().positions.forEach(item => savePoint(resolveMarketSymbol(item), item.price));
  watchlist().forEach(item => savePoint(resolveMarketSymbol(item), item.price));
  const data = portfolio();
  savePoint('PORTFOLIO', data.positions.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), Number(data.cash || 0)));
  document.getElementById('portfolioTable')?.addEventListener('click', event => {
    const row = event.target.closest('tr');
    const ticker = row?.dataset.ticker || row?.querySelector('.asset-cell small')?.textContent?.split('•')[0]?.trim();
    const item = portfolio().positions.find(position => position.ticker === ticker || position.marketSymbol === ticker);
    if (item) openDetails(item);
  });
  document.getElementById('watchlist')?.addEventListener('click', event => {
    const card = event.target.closest('.watch-card');
    const ticker = card?.dataset.ticker || card?.dataset.marketSymbol || card?.querySelector('.ticker')?.textContent?.split('•')[0]?.trim();
    const item = watchlist().find(entry => entry.ticker === ticker || entry.marketSymbol === ticker);
    if (item) openDetails(item);
  });
  document.querySelector('.wealth-card')?.addEventListener('click', () => {
    const current = portfolio();
    const total = current.positions.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), Number(current.cash || 0));
    openDetails({ name: 'Votre portefeuille', ticker: 'PORTFOLIO', marketSymbol: 'PORTFOLIO', price: total, change: null }, 'portfolio');
  });
  editGoal();
  editCash();
}

init();

export { RANGES, openDetails, savePoint, pointsFor };
