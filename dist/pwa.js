const INSTALL_DISMISSED_KEY = 'leynor-install-dismissed-at';
const DISMISSAL_DELAY = 7 * 24 * 60 * 60 * 1000;
const UPDATE_RELOAD_KEY = 'leynor-pwa-update-reloaded';

let deferredInstallPrompt = null;

function assetUrl(path) {
  return new URL(path, document.baseURI).toString();
}

function ensureHeadAsset(selector, factory) {
  if (document.head.querySelector(selector)) return;
  document.head.append(factory());
}

function installPwaMetadata() {
  ensureHeadAsset('link[rel="manifest"]', () => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = assetUrl('manifest.webmanifest');
    return link;
  });
  ensureHeadAsset('link[data-leynor-pwa]', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = assetUrl('pwa.css');
    link.dataset.leynorPwa = 'true';
    return link;
  });
  ensureHeadAsset('link[rel="icon"]', () => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = assetUrl('icons/leynor-icon.svg');
    link.type = 'image/svg+xml';
    return link;
  });
  ensureHeadAsset('link[rel="apple-touch-icon"]', () => {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = assetUrl('icons/leynor-icon.svg');
    return link;
  });
  ensureHeadAsset('meta[name="theme-color"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#071426';
    return meta;
  });
  ensureHeadAsset('meta[name="apple-mobile-web-app-capable"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-capable';
    meta.content = 'yes';
    return meta;
  });
  ensureHeadAsset('meta[name="apple-mobile-web-app-title"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    meta.content = 'LEYNOR';
    return meta;
  });
  ensureHeadAsset('meta[name="mobile-web-app-capable"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'mobile-web-app-capable';
    meta.content = 'yes';
    return meta;
  });
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function wasRecentlyDismissed() {
  const timestamp = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
  return timestamp > 0 && Date.now() - timestamp < DISMISSAL_DELAY;
}

function createInstallBanner() {
  if (document.querySelector('#leynorInstallBanner') || isStandalone() || wasRecentlyDismissed()) return;

  const banner = document.createElement('aside');
  banner.id = 'leynorInstallBanner';
  banner.className = 'pwa-install-banner';
  banner.hidden = true;
  banner.setAttribute('aria-label', 'Installer LEYNOR');
  banner.innerHTML = `
    <img class="pwa-install-mark" src="${assetUrl('icons/leynor-icon.svg')}" alt="" aria-hidden="true" />
    <div class="pwa-install-copy">
      <strong>Installer LEYNOR</strong>
      <span>Ajoutez votre copilote d’investissement à l’écran d’accueil.</span>
    </div>
    <button class="btn pwa-install-action" type="button">Installer</button>
    <button class="icon-btn pwa-install-close" type="button" aria-label="Plus tard">×</button>`;

  banner.querySelector('.pwa-install-action').addEventListener('click', installApp);
  banner.querySelector('.pwa-install-close').addEventListener('click', dismissBanner);
  document.body.append(banner);
}

function showInstallBanner() {
  createInstallBanner();
  const banner = document.querySelector('#leynorInstallBanner');
  if (banner && deferredInstallPrompt) banner.hidden = false;
}

function dismissBanner() {
  localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  document.querySelector('#leynorInstallBanner')?.remove();
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (result.outcome === 'accepted') document.querySelector('#leynorInstallBanner')?.remove();
  else dismissBanner();
}

function reloadOnceAfterControllerChange() {
  if (sessionStorage.getItem(UPDATE_RELOAD_KEY) === 'true') return;
  sessionStorage.setItem(UPDATE_RELOAD_KEY, 'true');
  window.location.reload();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const workerUrl = assetUrl('service-worker.js');
    const scopeUrl = assetUrl('./');
    const registration = await navigator.serviceWorker.register(workerUrl, { scope: scopeUrl, updateViaCache: 'none' });
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnceAfterControllerChange, { once: true });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('leynor:pwa-update-ready'));
        }
      });
    });
    await registration.update();
  } catch (error) {
    console.warn('LEYNOR PWA: service worker indisponible.', error);
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  localStorage.removeItem(INSTALL_DISMISSED_KEY);
  document.querySelector('#leynorInstallBanner')?.remove();
});

installPwaMetadata();
createInstallBanner();
registerServiceWorker();

export { assetUrl, installPwaMetadata, isStandalone, wasRecentlyDismissed };
