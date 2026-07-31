import './pwa.js';
import './leynor-assistant.js';

const API_TOKEN_KEY = 'invest-dashboard-api-token';

function createTrendsNavigation() {
  const nav = document.querySelector('.main-nav');
  if (!nav || nav.querySelector('[data-trends-link]')) return;
  const link = document.createElement('a');
  link.className = 'nav-item';
  link.href = 'trends.html';
  link.dataset.trendsLink = 'true';
  link.innerHTML = '<span>↗</span>Tendances';
  const assistant = nav.querySelector('a[href="#assistant"]');
  nav.insertBefore(link, assistant || null);
}

function createConnectionControl() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.querySelector('#serverConnectionBtn')) return;

  const status = document.createElement('span');
  status.id = 'serverConnectionStatus';
  status.className = 'badge';
  status.textContent = 'Serveur à vérifier';

  const button = document.createElement('button');
  button.id = 'serverConnectionBtn';
  button.className = 'btn secondary';
  button.type = 'button';
  button.textContent = 'Connexion serveur';
  button.addEventListener('click', configureConnection);

  actions.prepend(status);
  actions.prepend(button);
  verifyConnection();
}

async function configureConnection() {
  const existing = localStorage.getItem(API_TOKEN_KEY) || '';
  const token = window.prompt('Colle la valeur APP_AUTH_TOKEN configurée dans Railway :', existing);
  if (token == null) return;

  const normalized = token.trim();
  if (normalized) localStorage.setItem(API_TOKEN_KEY, normalized);
  else localStorage.removeItem(API_TOKEN_KEY);

  await verifyConnection();
}

async function verifyConnection() {
  const status = document.querySelector('#serverConnectionStatus');
  const button = document.querySelector('#serverConnectionBtn');
  if (!status || !button) return;

  status.textContent = 'Vérification…';
  button.disabled = true;

  try {
    const healthResponse = await fetch('/health', { cache: 'no-store' });
    if (!healthResponse.ok) throw new Error(`Healthcheck HTTP ${healthResponse.status}`);

    const token = localStorage.getItem(API_TOKEN_KEY) || '';
    if (!token) {
      status.textContent = 'Serveur actif • token requis';
      return;
    }

    const response = await fetch('/portfolios', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (response.status === 401) {
      status.textContent = 'Token invalide';
      return;
    }
    if (!response.ok) throw new Error(`API HTTP ${response.status}`);

    const payload = await response.json();
    const count = Array.isArray(payload?.data) ? payload.data.length : 0;
    updatePortfolioCount(count);
  } catch (error) {
    console.error('Server connection error:', error);
    status.textContent = 'Serveur indisponible';
  } finally {
    button.disabled = false;
  }
}

function updatePortfolioCount(count) {
  const status = document.querySelector('#serverConnectionStatus');
  if (!status) return;
  status.textContent = `Serveur connecté • ${count} portefeuille${count > 1 ? 's' : ''}`;
}

window.addEventListener('portfolio-server-ready', event => {
  const count = Number(event.detail?.count || 0);
  updatePortfolioCount(count);
});

createTrendsNavigation();
createConnectionControl();
