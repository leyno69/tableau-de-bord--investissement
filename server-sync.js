import './leynor-brand.js';
import './pwa.js';
import './api-fetch-router.js';
import './leynor-assistant.js';
import { apiUrl, getApiBaseUrl, getApiToken, setApiBaseUrl, setApiToken } from './api-connection.js';

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

function createConnectionControl() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.querySelector('#serverConnectionBtn')) return;
  const status = document.createElement('span');
  status.id = 'serverConnectionStatus';
  status.className = 'badge';
  status.textContent = 'Serveur à configurer';
  status.title = 'Touchez Connexion serveur pour renseigner l’adresse du backend.';
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
  const currentUrl = getApiBaseUrl();
  const url = window.prompt('Adresse publique du serveur LEYNOR (ex. https://votre-projet.up.railway.app) :', currentUrl);
  if (url == null) return;
  try {
    setApiBaseUrl(url);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Adresse serveur invalide.');
    return;
  }

  const token = window.prompt('Jeton APP_AUTH_TOKEN du serveur :', getApiToken());
  if (token != null) setApiToken(token);
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
  if (!button) return;
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    setConnectionStatus('Serveur non configuré', 'Aucune adresse de backend n’est enregistrée.');
    return;
  }

  const token = getApiToken();
  if (!token) {
    setConnectionStatus('Token requis', 'Renseigne le APP_AUTH_TOKEN du serveur pour tester la connexion sécurisée.');
    return;
  }

  setConnectionStatus('Vérification…', `Test sécurisé de ${baseUrl}`);
  button.disabled = true;
  try {
    const response = await fetch(apiUrl('/portfolios'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (response.status === 401) {
      setConnectionStatus('Token invalide', `${baseUrl} répond, mais refuse le jeton enregistré.`);
      return;
    }
    if (!response.ok) throw new Error(`L’API répond HTTP ${response.status} sur /portfolios.`);
    const payload = await response.json();
    updatePortfolioCount(Array.isArray(payload?.data) ? payload.data.length : 0, baseUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Erreur réseau inconnue.';
    console.error('Server connection error:', error);
    setConnectionStatus('Serveur inaccessible', `${baseUrl} — ${reason}. Vérifier le déploiement et CORS_ALLOWED_ORIGINS.`);
  } finally {
    button.disabled = false;
  }
}

function updatePortfolioCount(count, baseUrl = getApiBaseUrl()) {
  setConnectionStatus(`Serveur connecté • ${count} portefeuille${count > 1 ? 's' : ''}`, baseUrl);
}

window.addEventListener('portfolio-server-ready', event => updatePortfolioCount(Number(event.detail?.count || 0)));
window.addEventListener('leynor-api-connection-changed', verifyConnection);
createProductNavigation();
createConnectionControl();

export { configureConnection, verifyConnection };
