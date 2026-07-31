const PROFILE_MENU_ID = 'leynor-profile-menu';
const PROFILE_STYLE_ID = 'leynor-profile-menu-styles';
const RESET_EVENT = 'leynor-local-profile-reset';

function ensureStylesheet() {
  if (document.querySelector(`#${PROFILE_STYLE_ID}`)) return;
  const link = document.createElement('link');
  link.id = PROFILE_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = 'profile-menu.css';
  document.head.append(link);
}

function clearLocalProfile(storage = localStorage, session = sessionStorage) {
  storage.clear();
  session.clear();
  window.dispatchEvent(new CustomEvent(RESET_EVENT));
}

function createProfileMenu() {
  const card = document.querySelector('.profile-card');
  const trigger = card?.querySelector('.icon-btn');
  if (!card || !trigger || document.querySelector(`#${PROFILE_MENU_ID}`)) return;

  ensureStylesheet();
  card.classList.add('profile-card--interactive');
  trigger.type = 'button';
  trigger.id = 'profileMenuButton';
  trigger.setAttribute('aria-label', 'Ouvrir le menu du profil');
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const menu = document.createElement('div');
  menu.id = PROFILE_MENU_ID;
  menu.className = 'profile-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
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
      localStorage.setItem('leynor-beta-profile-mode', 'guest');
      window.location.reload();
      return;
    }
    if (action === 'signout') {
      const confirmed = window.confirm('Supprimer les données locales de ce profil sur cet appareil ? Le serveur bêta restera disponible.');
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

export { PROFILE_MENU_ID, RESET_EVENT, clearLocalProfile, createProfileMenu };
