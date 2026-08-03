(() => {
  const diagnostics = [];

  function remember(message) {
    diagnostics.push(String(message));
    try { sessionStorage.setItem('leynor-browser-errors', JSON.stringify(diagnostics.slice(-10))); } catch {}
  }

  window.addEventListener('error', event => {
    remember(event.error?.stack || event.message || 'Erreur JavaScript inconnue');
  });
  window.addEventListener('unhandledrejection', event => {
    remember(event.reason?.stack || event.reason || 'Promesse rejetée');
  });

  function unlockUi() {
    document.documentElement.style.pointerEvents = 'auto';
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'auto';
    document.body.classList.remove('assistant-open');

    document.querySelectorAll('.assistant-backdrop:not(.open), .assistant-drawer:not(.open), [inert]').forEach(element => {
      if (!element.classList.contains('open')) {
        element.style.pointerEvents = 'none';
      }
    });

    document.querySelectorAll('button, a, input, select, textarea').forEach(element => {
      element.style.pointerEvents = 'auto';
      element.style.touchAction = 'manipulation';
    });
  }

  async function retireStaleWorkers() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('leynor-shell-')).map(key => caches.delete(key)));
    } catch (error) {
      remember(error);
    }
  }

  function bindNativeFallbacks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        const target = document.querySelector(link.getAttribute('href'));
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const positionDialog = document.querySelector('#positionDialog');
    const watchDialog = document.querySelector('#watchDialog');
    document.querySelector('#addPositionBtn')?.addEventListener('click', () => {
      if (positionDialog && !positionDialog.open) positionDialog.showModal();
    });
    document.querySelector('#addWatchBtn')?.addEventListener('click', () => {
      if (watchDialog && !watchDialog.open) watchDialog.showModal();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    unlockUi();
    bindNativeFallbacks();
    await retireStaleWorkers();
    window.setTimeout(unlockUi, 500);
    window.setTimeout(unlockUi, 2000);
  }, { once: true });
})();
