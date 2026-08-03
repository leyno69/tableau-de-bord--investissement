const ICONS = Object.freeze({
  overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  portfolio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM9 5v14M4 10h16"/></svg>',
  radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2"/></svg>',
  goals: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m14 10 6-6M17 4h3v3"/></svg>',
  assistant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>'
});

const NAV_KEYS = ['overview', 'portfolio', 'radar', 'goals', 'assistant'];

function installStyles() {
  const style = document.createElement('style');
  style.dataset.leynorMobileRuntime = 'true';
  style.textContent = `
    .nav-item .nav-icon{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px}
    .nav-item .nav-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .ui-runtime-warning{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:120;padding:12px 14px;border:1px solid rgba(255,127,142,.45);border-radius:12px;background:#25131b;color:#fff;font-size:.82rem;box-shadow:0 12px 40px rgba(0,0,0,.35)}
    @media(max-width:680px){
      body{background:#07111f;min-height:100dvh}
      .app-shell{min-height:100dvh;background:linear-gradient(145deg,#06101c,#091626)}
      .sidebar{position:sticky;top:0;z-index:60;padding-top:max(10px,env(safe-area-inset-top));overflow:visible}
      .main-nav{min-width:0;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .main-nav::-webkit-scrollbar{display:none}
      .nav-item,.nav-item:nth-child(n){display:flex!important;min-width:46px;min-height:46px;padding:10px;justify-content:center;touch-action:manipulation}
      .nav-item>span:not(.nav-icon){display:none}
      .workspace{min-height:calc(100dvh - 67px)}
      .metric-grid,.layout-main{display:grid!important}
      button,a,select,input{pointer-events:auto!important}
      .wealth-card::after{pointer-events:none}
    }
  `;
  document.head.append(style);
}

function replaceNavigationIcons() {
  document.querySelectorAll('.main-nav .nav-item').forEach((item, index) => {
    const key = NAV_KEYS[index];
    if (!key) return;
    const old = item.querySelector('span');
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.innerHTML = ICONS[key];
    old?.replaceWith(icon);
  });
}

function activateNavigation(target) {
  document.querySelectorAll('.main-nav .nav-item').forEach(item => {
    const active = item.getAttribute('href') === `#${target}`;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function bindNavigation() {
  document.querySelectorAll('.main-nav .nav-item').forEach(item => {
    item.addEventListener('click', event => {
      const id = item.getAttribute('href')?.slice(1);
      if (!id || id === 'assistant') return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activateNavigation(id);
      history.replaceState(history.state, '', `#${id}`);
    });
  });
}

function bindFallbackActions() {
  const positionDialog = document.querySelector('#positionDialog');
  const watchDialog = document.querySelector('#watchDialog');
  document.querySelector('#addPositionBtn')?.addEventListener('click', () => {
    if (positionDialog && !positionDialog.open) positionDialog.showModal();
  });
  document.querySelector('#addWatchBtn')?.addEventListener('click', () => {
    if (watchDialog && !watchDialog.open) watchDialog.showModal();
  });
}

function auditRuntime() {
  const required = ['overview', 'portfolio', 'radar', 'goals', 'assistant', 'refreshBtn', 'addPositionBtn', 'addWatchBtn'];
  const missing = required.filter(id => !document.getElementById(id));
  const sectionsHidden = ['.metric-grid', '.layout-main'].filter(selector => {
    const element = document.querySelector(selector);
    return !element || getComputedStyle(element).display === 'none';
  });
  if (!missing.length && !sectionsHidden.length) return;
  const warning = document.createElement('div');
  warning.className = 'ui-runtime-warning';
  warning.setAttribute('role', 'alert');
  warning.textContent = `Interface incomplète : ${[...missing, ...sectionsHidden].join(', ')}. Rechargez la page après le prochain déploiement.`;
  document.body.append(warning);
}

function initMobileRuntime() {
  installStyles();
  replaceNavigationIcons();
  bindNavigation();
  bindFallbackActions();
  requestAnimationFrame(auditRuntime);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMobileRuntime, { once: true });
else initMobileRuntime();
