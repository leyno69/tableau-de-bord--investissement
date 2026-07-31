import './leynor-brand.js';
import './pwa.js';
import './api-fetch-router.js';
import './leynor-assistant.js';
import './opportunity-radar-ui.js';
import { apiUrl, getApiBaseUrl, getApiToken, setApiBaseUrl, setApiToken, usesSecureProxy } from './api-connection.js';

function addNavigationLink({ href, label, icon, marker, before }) {
  const nav = document.querySelector('.main-nav');
  if (!nav || nav.querySelector(`[${marker}]`)) return;
  const link = document.createElement('a');
  link.className = 'nav-item';
  link.href = href;
  link.setAttribute(marker, 'true');
  link.innerHTML = `<span>${icon}</span>${label}`;
  const anchor = nav.querySelector(before);
  nav.insertBefore(link, anchor || null);
}

function createProductNavigation() {
  addNavigationLink({ href: 'trends.html', label: 'Tendances', icon: '↗', marker: 'data-trends-link', before: 'a[href="#assistant"]' });
  addNavigationLink({ href: 'simulator.html', label: 'Simulation', icon: '◈', marker: 'data-simulation-link', before: 'a[href="#assistant"]' });
  addNavigationLink({ href: 'feedback.html', label: 'Retour bêta', icon: '◇', marker: 'data-feedback-link', before: 'a[href="#assistant"]' });
}

function createSimulationShortcut() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || actions.querySelector('[data-simulation-shortcut]')) return;
  const link = document.createElement('a');
  link.className = 'btn secondary';
  link.href = 'simulator.html';
  link.setAttribute('data-simulation-shortcut', 'true');
  link.setAttribute('aria-label', 'Ouvrir le mode simulation fictif');
  link.textContent = '◈ Mode simulation';
  actions.append(link);
}

function createConnectionControl() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.querySelector('#serverConnectionStatus')) return;
  const status = document.createElement('span');
  status.id = 'serverConnectionStatus';
  status.className = 'badge';
  status.textContent = usesSecureProxy() ? 'Connexion sécurisée…' : 'Serveur à configurer';
  actions.prepend(status);

  if (!usesSecureProxy()) {
    const button = document.createElement('button');
    button.id = 'serverConnectionBtn';
    button.className = 'btn secondary';
    button.type = 'button';
    button.textContent = 'Connexion serveur';
    button.addEventListener('click', configureConnection);
    actions.prepend(button);
  }
  verifyConnection();
}

async function configureConnection() {
  const currentUrl = getApiBaseUrl();
  const url = window.prompt('Adresse publique du serveur LEYNOR :', currentUrl);
  if (url == null) return;
  try {
    setApiBaseUrl(url);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Adresse serveur invalide.');
    return;
  }

  if (!usesSecureProxy()) {
    const token = window.prompt('Jeton APP_AUTH_TOKEN du serveur :', getApiToken());
    if (token != null) setApiToken(token);
  }
  await verifyConnection();
}

function setConnectionStatus(message, detail = message) {
  const status = document.querySelector('#serverConnectionStatus');
  if (!status) return;
  status.textContent = message;
  status.title = detail;
}

async function verifyConnection() {
  const button = document.querySelector('#serverConnectionBtn');
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    setConnectionStatus('Serveur non configuré', 'Aucune adresse de backend n’est enregistrée.');
    return;
  }

  const token = getApiToken();
  if (!usesSecureProxy() && !token) {
    setConnectionStatus('Token requis', 'Renseigne le APP_AUTH_TOKEN du serveur pour tester la connexion sécurisée.');
    return;
  }

  setConnectionStatus('Vérification…', usesSecureProxy() ? 'Connexion via le proxy sécurisé Vercel.' : `Test sécurisé de ${baseUrl}`);
  if (button) button.disabled = true;
  try {
    const headers = token && !usesSecureProxy() ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(apiUrl('/portfolios'), { headers, cache: 'no-store' });
    if (response.status === 401) {
      setConnectionStatus('Token invalide', `${baseUrl} répond, mais refuse le jeton enregistré.`);
      return;
    }
    if (response.status === 503) {
      setConnectionStatus('Proxy à configurer', 'Ajoute LEYNOR_BACKEND_URL et LEYNOR_BACKEND_TOKEN dans Vercel.');
      return;
    }
    if (!response.ok) throw new Error(`L’API répond HTTP ${response.status} sur /portfolios.`);
    const payload = await response.json();
    updatePortfolioCount(Array.isArray(payload?.data) ? payload.data.length : 0, baseUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Erreur réseau inconnue.';
    console.error('Server connection error:', error);
    setConnectionStatus('Serveur inaccessible', `${baseUrl} — ${reason}`);
  } finally {
    if (button) button.disabled = false;
  }
}

function updatePortfolioCount(count, baseUrl = getApiBaseUrl()) {
  const label = usesSecureProxy() ? `Bêta connectée • ${count} portefeuille${count > 1 ? 's' : ''}` : `Serveur connecté • ${count} portefeuille${count > 1 ? 's' : ''}`;
  setConnectionStatus(label, baseUrl);
}

window.addEventListener('portfolio-server-ready', event => updatePortfolioCount(Number(event.detail?.count || 0)));
window.addEventListener('leynor-api-connection-changed', verifyConnection);
createProductNavigation();
createSimulationShortcut();
createConnectionControl();

export { configureConnection, verifyConnection };
