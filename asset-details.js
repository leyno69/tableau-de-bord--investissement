import { fetchQuote, fetchDailyHistory, resolveMarketSymbol } from './market.js';

const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const WATCHLIST_KEY = 'invest-dashboard-watchlist';
const GOAL_KEY = 'leynor-long-term-goal';
const HISTORY_KEY = 'leynor-market-history-v2';
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
function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

function savePoint(symbol, price, at = Date.now()) {
  if (!symbol || !Number.isFinite(Number(price))) return;
  const all = history();
  const points = Array.isArray(all[symbol]) ? all[symbol] : [];
  const last = points.at(-1);
  if (!last || at - last.at > 60000 || Number(last.price) !== Number(price)) points.push({ at, price: Number(price), source: 'observation' });
  all[symbol] = points.slice(-5000);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

function localPoints(symbol, range) {
  const min = Date.now() - duration(range);
  return (history()[symbol] || []).filter(point => point.at >= min);
}

function chart(points) {
  if (points.length < 2) return '<div class="chart-empty">Historique insuffisant pour cette période.</div>';
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

async function loadRange(symbol, range) {
  if (range === '1H' || range === '1J' || symbol === 'PORTFOLIO') {
    return { points: localPoints(symbol, range), source: symbol === 'PORTFOLIO' ? 'Historique local du portefeuille' : 'Observations locales LEYNOR' };
  }
  const now = Date.now();
  const from = range === 'MAX' ? undefined : isoDate(now - duration(range));
  const result = await fetchDailyHistory(symbol, { from, to: isoDate(now) });
  return { points: result.points, source: 'Historique quotidien EODHD contrôlé', provenance: result.provenance };
}

async function openDetails(item, type = 'asset') {
  const modal = getDialog();
  const content = modal.querySelector('#assetDetailsContent');
  const symbol = resolveMarketSymbol(item);
  savePoint(symbol, item.price);
  modal.showModal();
  let quote = null;
  let quoteError = null;
  if (symbol !== 'PORTFOLIO') {
    try {
      quote = await fetchQuote(symbol);
      savePoint(symbol, quote.price, quote.datetime ? Date.parse(quote.datetime) || Date.now() : Date.now());
    } catch (error) { quoteError = error instanceof Error ? error.message : 'Cours indisponible.'; }
  }
  let activeRange = type === 'portfolio' ? '1J' : '1M';
  let rangeState = { loading: true, points: [], source: '' };

  const render = () => {
    const price = quote?.price ?? item.price;
    const change = quote?.percentChange ?? item.change;
    content.innerHTML = `<header class="asset-details-head"><div><p>${type === 'portfolio' ? 'DÉTAIL DU PORTEFEUILLE' : 'FICHE ACTIF'}</p><h2>${item.name}</h2><span>${symbol}</span></div><button type="button" data-close aria-label="Fermer">×</button></header><section class="asset-quote"><strong>${money.format(Number(price || 0))}</strong><span class="${Number(change) >= 0 ? 'positive' : 'negative'}">${Number.isFinite(Number(change)) ? `${Number(change) >= 0 ? '+' : ''}${Number(change).toFixed(2)} %` : 'Variation indisponible'}</span></section><nav class="chart-ranges">${RANGES.map(range => `<button type="button" data-range="${range}" class="${range === activeRange ? 'active' : ''}">${range}</button>`).join('')}</nav><section class="chart-shell">${rangeState.loading ? '<div class="chart-empty">Chargement de l’historique…</div>' : chart(rangeState.points)}</section><footer class="asset-details-foot"><span>${quoteError || `Dernière donnée : ${quote?.datetime || item.marketUpdatedAt || 'cours enregistré localement'}`}</span><small>${rangeState.source || 'Aucune donnée historique chargée.'}${type === 'portfolio' ? ' Les périodes longues se construiront au fil des synchronisations.' : ''} Le graphique affiche uniquement les observations réellement enregistrées ou l’historique quotidien contrôlé.</small></footer>`;
    content.querySelector('[data-close]').addEventListener('click', () => modal.close());
    content.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', async () => {
      activeRange = button.dataset.range;
      rangeState = { loading: true, points: [], source: '' };
      render();
      try { rangeState = { loading: false, ...(await loadRange(symbol, activeRange)) }; }
      catch (error) { rangeState = { loading: false, points: localPoints(symbol, activeRange), source: `Historique distant indisponible : ${error.message}` }; }
      render();
    }));
  };

  render();
  try { rangeState = { loading: false, ...(await loadRange(symbol, activeRange)) }; }
  catch (error) { rangeState = { loading: false, points: localPoints(symbol, activeRange), source: `Historique distant indisponible : ${error.message}` }; }
  render();
}

function makeEditableCard(selector, promptText, read, validate, save, title) {
  const card = document.querySelector(selector);
  if (!card) return;
  card.tabIndex = 0;
  card.title = title;
  const edit = () => {
    const answer = prompt(promptText, String(read()));
    if (answer == null) return;
    const value = Number(answer.replace(/\s/g, '').replace(',', '.'));
    if (!validate(value)) return alert('Montant invalide.');
    save(value);
    location.reload();
  };
  card.addEventListener('click', edit);
  card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); } });
}

function initEditableSettings() {
  const goalValue = document.querySelector('.goal-card strong');
  if (goalValue) goalValue.textContent = money.format(Number(localStorage.getItem(GOAL_KEY) || 200000));
  makeEditableCard('.goal-card', 'Nouvel objectif long terme en euros :', () => localStorage.getItem(GOAL_KEY) || 200000, value => Number.isFinite(value) && value > 0, value => localStorage.setItem(GOAL_KEY, String(value)), 'Cliquer pour modifier votre objectif');

  const cashCard = document.getElementById('cashValue')?.closest('.metric-card');
  const note = cashCard?.querySelector('small');
  if (note) note.textContent = 'valeur locale — cliquez pour corriger';
  makeEditableCard('#cashValue', 'Liquidités disponibles chez votre courtier :', () => portfolio().cash || 0, amount => Number.isFinite(amount) && amount >= 0, amount => {
    const data = portfolio();
    data.cash = amount;
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
  }, 'Cliquer pour corriger les liquidités locales');
}

function init() {
  portfolio().positions.forEach(item => savePoint(resolveMarketSymbol(item), item.price));
  watchlist().forEach(item => savePoint(resolveMarketSymbol(item), item.price));
  const data = portfolio();
  savePoint('PORTFOLIO', data.positions.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), Number(data.cash || 0)));
  document.getElementById('portfolioTable')?.addEventListener('click', event => {
    const ticker = event.target.closest('tr')?.querySelector('.asset-cell small')?.textContent?.split('•')[0]?.trim();
    const item = portfolio().positions.find(position => position.ticker === ticker);
    if (item) openDetails(item);
  });
  document.getElementById('watchlist')?.addEventListener('click', event => {
    const ticker = event.target.closest('.watch-card')?.querySelector('.ticker')?.textContent?.split('•')[0]?.trim();
    const item = watchlist().find(entry => entry.ticker === ticker);
    if (item) openDetails(item);
  });
  document.querySelector('.wealth-card')?.addEventListener('click', () => {
    const current = portfolio();
    const total = current.positions.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), Number(current.cash || 0));
    openDetails({ name: 'Votre portefeuille', ticker: 'PORTFOLIO', marketSymbol: 'PORTFOLIO', price: total, change: null }, 'portfolio');
  });
  initEditableSettings();
}

init();
