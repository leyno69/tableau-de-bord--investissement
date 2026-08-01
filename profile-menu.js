const PROFILE_MENU_ID = 'leynor-profile-menu';
const PROFILE_STYLE_ID = 'leynor-profile-menu-styles';
const RESET_EVENT = 'leynor-local-profile-reset';
const PROFILE_MODE_KEY = 'leynor-beta-profile-mode';
const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const WATCHLIST_KEY = 'invest-dashboard-watchlist';
const BROKER_KEY = 'invest-dashboard-active-broker';
const BACKUP_PREFIX = 'leynor-private-backup:';
const EMPTY_PORTFOLIO = JSON.stringify({ cash: 0, positions: [] });
const EMPTY_WATCHLIST = JSON.stringify([]);

function ensureStylesheet() {
  if (document.querySelector(`#${PROFILE_STYLE_ID}`)) return;
  const link = document.createElement('link');
  link.id = PROFILE_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = 'profile-menu.css';
  document.head.append(link);
}

function backupPrivateData(storage = localStorage, session = sessionStorage) {
  for (const key of [PORTFOLIO_KEY, WATCHLIST_KEY, BROKER_KEY]) {
    const value = storage.getItem(key);
    if (value != null) session.setItem(`${BACKUP_PREFIX}${key}`, value);
  }
}

function applyGuestData(storage = localStorage) {
  storage.setItem(PROFILE_MODE_KEY, 'guest');
  storage.setItem(PORTFOLIO_KEY, EMPTY_PORTFOLIO);
  storage.setItem(WATCHLIST_KEY, EMPTY_WATCHLIST);
  storage.setItem(BROKER_KEY, 'all');
}

function restorePrivateData(storage = localStorage, session = sessionStorage) {
  for (const key of [PORTFOLIO_KEY, WATCHLIST_KEY, BROKER_KEY]) {
    const backupKey = `${BACKUP_PREFIX}${key}`;
    const value = session.getItem(backupKey);
    if (value != null) storage.setItem(key, value);
    session.removeItem(backupKey);
  }
  storage.removeItem(PROFILE_MODE_KEY);
}

function clearLocalProfile(storage = localStorage, session = sessionStorage) {
  storage.clear();
  session.clear();
  applyGuestData(storage);
  window.dispatchEvent(new CustomEvent(RESET_EVENT));
}

function updateGreeting(mode = localStorage.getItem(PROFILE_MODE_KEY)) {
  const title = document.querySelector('#overview h1');
  if (!title) return;
  title.textContent = mode === 'guest' ? 'Bienvenue, voici l’essentiel.' : 'Bonjour Oscar, voici l’essentiel.';
}

function updateProfileCard(mode = localStorage.getItem(PROFILE_MODE_KEY)) {
  const card = document.querySelector('.profile-card');
  if (!card) return;
  const avatar = card.querySelector('.avatar');
  const name = card.querySelector('strong');
  const subtitle = card.querySelector('small');
  const guest = mode === 'guest';
  if (avatar) avatar.textContent = guest ? 'IN' : 'OL';
  if (name) name.textContent = guest ? 'Invité' : 'Oscar';
  if (subtitle) subtitle.textContent = guest ? 'Portefeuille privé masqué' : 'Profil investisseur';
  card.dataset.profileMode = guest ? 'guest' : 'private';
  updateGreeting(mode);
}

function createProfileMenu() {
  const card = document.querySelector('.profile-card');
  const trigger = card?.querySelector('.icon-btn');
  if (!card || !trigger || document.querySelector(`#${PROFILE_MENU_ID}`)) return;

  ensureStylesheet();
  updateProfileCard();
  card.classList.add('profile-card--interactive');
  trigger.type = 'button';
  trigger.id = 'profileMenuButton';
  trigger.setAttribute('aria-label', 'Ouvrir le menu du profil');
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const isGuest = localStorage.getItem(PROFILE_MODE_KEY) === 'guest';
  const menu = document.createElement('div');
  menu.id = PROFILE_MENU_ID;
  menu.className = 'profile-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.innerHTML = isGuest ? `
    <button type="button" role="menuitem" data-profile-action="restore">Revenir à mon profil sur cet appareil</button>
    <button type="button" role="menuitem" class="profile-menu__danger" data-profile-action="signout">Effacer toutes les données de cet appareil</button>
  ` : `
    <button type="button" role="menuitem" data-profile-action="guest">Passer en mode invité</button>
    <button type="button" role="menuitem" class="profile-menu__danger" data-profile-action="signout">Se déconnecter de cet appareil</button>
  `;
  card.append(menu);

  const close = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    trigger.setAttribute('aria-expanded', String(willOpen));
  });

  menu.addEventListener('click', event => {
    const action = event.target.closest('[data-profile-action]')?.dataset.profileAction;
    if (!action) return;
    if (action === 'guest') {
      backupPrivateData();
      applyGuestData();
      window.location.reload();
      return;
    }
    if (action === 'restore') {
      restorePrivateData();
      window.location.reload();
      return;
    }
    if (action === 'signout') {
      const confirmed = window.confirm('Effacer les données privées enregistrées sur cet appareil et afficher un espace invité vide ?');
      if (!confirmed) return;
      clearLocalProfile();
      window.location.reload();
    }
  });

  document.addEventListener('click', event => {
    if (!card.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
}

createProfileMenu();

export {
  PROFILE_MENU_ID,
  RESET_EVENT,
  PROFILE_MODE_KEY,
  PORTFOLIO_KEY,
  WATCHLIST_KEY,
  BROKER_KEY,
  backupPrivateData,
  applyGuestData,
  restorePrivateData,
  clearLocalProfile,
  updateGreeting,
  updateProfileCard,
  createProfileMenu
};
