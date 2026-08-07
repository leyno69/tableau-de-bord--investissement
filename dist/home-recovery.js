const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const WATCHLIST_KEY = 'invest-dashboard-watchlist';
const BROKER_KEY = 'invest-dashboard-active-broker';
const RECOVERY_DELAY_MS = 1200;

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});

function clone(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function text(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function applicationIsReady() {
  const value = document.querySelector('#portfolioValue')?.textContent?.trim() || '';
  return value && !/chargement|initialisation|^—$/i.test(value);
}

function releasePotentialBlockers() {
  document.documentElement.style.removeProperty('pointer-events');
  document.body.style.removeProperty('pointer-events');

  document.querySelectorAll('[hidden]').forEach(node => {
    node.style.setProperty('display', 'none', 'important');
    node.style.setProperty('pointer-events', 'none', 'important');
  });

  document.querySelectorAll('dialog:not([open])').forEach(node => {
    node.style.setProperty('pointer-events', 'none', 'important');
  });

  const tour = document.querySelector('#leynorGuidedTour');
  if (!tour || tour.hidden) document.body.classList.remove('guided-tour-active');
}

function summarize(portfolio) {
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
  const cash = Number(portfolio?.cash || 0);
  const invested = positions.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.avgPrice || 0), 0);
  const positionsValue = positions.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const totalValue = positionsValue + cash;
  return { positions, cash, invested, totalValue, pnl: positionsValue - invested };
}

function renderBrokerControls(brokers, activeBroker) {
  const brokerSelect = document.querySelector('#brokerSelect');
  const positionBroker = document.querySelector('#positionBroker');

  if (brokerSelect) {
    brokerSelect.innerHTML = '';
    brokerSelect.add(new Option('Tous les courtiers', 'all'));
    brokers.forEach(broker => brokerSelect.add(new Option(broker.name, broker.id)));
    brokerSelect.value = activeBroker;
  }

  if (positionBroker) {
    positionBroker.innerHTML = '';
    brokers.forEach(broker => positionBroker.add(new Option(broker.name, broker.id)));
  }

  const panel = document.querySelector('#brokersPanel');
  if (panel) {
    panel.innerHTML = brokers.map(broker => `<div class="broker-row"><div><strong>${broker.name}</strong><small>${broker.fractional || ''}</small></div><span class="badge">${broker.status || 'Disponible'}</span></div>`).join('');
  }
}

function renderPortfolio(portfolio, activeBroker) {
  const summary = summarize(portfolio);
  const visible = activeBroker === 'all'
    ? summary.positions
    : summary.positions.filter(position => position.broker === activeBroker);

  const filtered = summarize({ ...portfolio, positions: visible });
  text('#portfolioValue', money.format(filtered.totalValue));
  text('#investedValue', money.format(filtered.invested));
  text('#pnlValue', money.format(filtered.pnl));
  text('#pnlPercent', filtered.invested ? `${((filtered.pnl / filtered.invested) * 100).toFixed(2)} %` : '0,00 %');
  text('#cashValue', money.format(summary.cash));
  text('#portfolioMove', `${filtered.pnl >= 0 ? '+' : ''}${money.format(filtered.pnl)} latent`);

  const table = document.querySelector('#portfolioTable');
  if (!table) return;
  if (!visible.length) {
    table.innerHTML = '<tr><td colspan="7" class="empty">Aucune position pour ce courtier.</td></tr>';
    return;
  }

  table.innerHTML = visible.map(position => {
    const quantity = Number(position.quantity || 0);
    const avgPrice = Number(position.avgPrice || 0);
    const price = Number(position.price || 0);
    const value = quantity * price;
    const invested = quantity * avgPrice;
    const performance = invested ? ((value - invested) / invested) * 100 : 0;
    return `<tr><td class="asset-cell"><strong>${position.name || position.ticker || 'Actif'}</strong><small>${position.ticker || '—'} • ${position.type || 'Actif'}</small></td><td>${position.broker || '—'}</td><td>${quantity.toLocaleString('fr-FR')}</td><td>${money.format(avgPrice)}</td><td>${money.format(price)}</td><td>${money.format(value)}</td><td class="${performance >= 0 ? 'positive' : 'negative'}">${performance.toFixed(2)} %</td></tr>`;
  }).join('');
}

function renderWatchlist(watchlist) {
  const container = document.querySelector('#watchlist');
  if (!container) return;
  const items = Array.isArray(watchlist) ? watchlist : [];
  container.innerHTML = items.map(item => `<article class="watch-card" data-ticker="${item.ticker || ''}" data-market-symbol="${item.marketSymbol || ''}"><div class="watch-card-top"><div><h3>${item.name || item.ticker || 'Actif'}</h3><span class="ticker">${item.ticker || '—'}</span></div><span class="badge">${item.signal || 'Surveiller'}</span></div><div class="watch-price">${money.format(Number(item.price || 0))}</div><div class="${Number(item.change || 0) >= 0 ? 'positive' : 'negative'}">${Number(item.change || 0) >= 0 ? '+' : ''}${Number(item.change || 0).toFixed(2)} % aujourd’hui</div><p class="watch-note">${item.marketError || item.note || '—'}</p></article>`).join('');
}

function bindCriticalActions(render) {
  const positionDialog = document.querySelector('#positionDialog');
  const watchDialog = document.querySelector('#watchDialog');

  document.querySelector('#addPositionBtn')?.addEventListener('click', () => {
    if (positionDialog && !positionDialog.open) positionDialog.showModal();
  });
  document.querySelector('#addWatchBtn')?.addEventListener('click', () => {
    if (watchDialog && !watchDialog.open) watchDialog.showModal();
  });
  document.querySelector('#brokerSelect')?.addEventListener('change', event => {
    try { localStorage.setItem(BROKER_KEY, event.target.value); } catch {}
    render(event.target.value);
  });
}

async function recoverHome() {
  releasePotentialBlockers();
  if (applicationIsReady()) return false;

  let defaults = { portfolio: { positions: [], cash: 0 }, watchlist: [], brokers: [] };
  try {
    const [{ defaultPortfolio }, { defaultWatchlist }, { brokers }] = await Promise.all([
      import('./portfolio.js'),
      import('./market.js'),
      import('./brokers.js')
    ]);
    defaults = { portfolio: defaultPortfolio, watchlist: defaultWatchlist, brokers };
  } catch (error) {
    console.warn('LEYNOR recovery: modules de données indisponibles, mode local minimal.', error);
  }

  const portfolio = readJson(PORTFOLIO_KEY, defaults.portfolio);
  const watchlist = readJson(WATCHLIST_KEY, defaults.watchlist);
  const activeBroker = (() => {
    try { return localStorage.getItem(BROKER_KEY) || 'all'; }
    catch { return 'all'; }
  })();

  renderBrokerControls(defaults.brokers, activeBroker);
  const render = broker => renderPortfolio(portfolio, broker || 'all');
  render(activeBroker);
  renderWatchlist(watchlist);
  bindCriticalActions(render);
  releasePotentialBlockers();

  document.documentElement.dataset.leynorRecovery = 'active';
  window.dispatchEvent(new CustomEvent('leynor:home-recovered'));
  return true;
}

function scheduleRecovery() {
  window.setTimeout(() => recoverHome().catch(error => {
    console.error('LEYNOR recovery failed:', error);
    releasePotentialBlockers();
  }), RECOVERY_DELAY_MS);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRecovery, { once: true });
else scheduleRecovery();

export { applicationIsReady, releasePotentialBlockers, summarize, recoverHome };
