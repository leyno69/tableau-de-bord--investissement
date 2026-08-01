import { REFRESH_INTERVALS, createRefreshStatus, shouldAutoRefreshMarket } from './refresh-policy.js';

const LAST_REFRESH_KEY = 'leynor-market-last-refresh-at';
let timer = null;
let refreshing = false;

function ensureRefreshPanel() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.querySelector('#leynorRefreshStatus')) return;
  const panel = document.createElement('div');
  panel.id = 'leynorRefreshStatus';
  panel.className = 'badge';
  panel.setAttribute('aria-live', 'polite');
  panel.style.maxWidth = '260px';
  panel.style.whiteSpace = 'normal';
  actions.append(panel);
}

function renderRefreshStatus() {
  ensureRefreshPanel();
  const panel = document.querySelector('#leynorRefreshStatus');
  if (!panel) return;
  const status = createRefreshStatus({ lastRefreshAt: localStorage.getItem(LAST_REFRESH_KEY) });
  panel.textContent = `Marché : ${status.lastMarketLabel} · Radar : ${status.nextRadarLabel}`;
  panel.title = `Cours : actualisation toutes les ${status.marketIntervalMinutes} min lorsque l’application est ouverte. Probabilités : recalcul prévu toutes les ${status.probabilityIntervalMinutes} min.`;
}

async function requestMarketRefresh({ force = false } = {}) {
  if (refreshing || document.hidden) return false;
  const lastRefreshAt = localStorage.getItem(LAST_REFRESH_KEY);
  if (!force && !shouldAutoRefreshMarket({ lastRefreshAt, visible: !document.hidden })) return false;
  const button = document.querySelector('#refreshBtn');
  if (!button) return false;
  refreshing = true;
  try {
    button.click();
    localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
    renderRefreshStatus();
    return true;
  } finally {
    window.setTimeout(() => { refreshing = false; }, 3000);
  }
}

function startRefreshRuntime() {
  renderRefreshStatus();
  requestMarketRefresh();
  timer ||= window.setInterval(() => requestMarketRefresh(), REFRESH_INTERVALS.marketWhenVisibleMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestMarketRefresh();
  });
  document.querySelector('#refreshBtn')?.addEventListener('click', () => {
    localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
    window.setTimeout(renderRefreshStatus, 500);
  });
}

startRefreshRuntime();

export { LAST_REFRESH_KEY, ensureRefreshPanel, renderRefreshStatus, requestMarketRefresh, startRefreshRuntime };
