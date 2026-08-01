const PDF_MESSAGE = 'Le fichier PDF a bien été sélectionné, mais sa lecture automatique n’est pas encore disponible dans cette version. Pour importer maintenant, utilisez l’export CSV de votre courtier.';

function selectedFile() {
  return document.getElementById('brokerImportFile')?.files?.[0] || null;
}

function isPdf(file) {
  return Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')));
}

function showPdfNotice() {
  const status = document.getElementById('brokerImportStatus');
  if (status) {
    status.textContent = PDF_MESSAGE;
    status.classList.add('warning');
    status.classList.remove('success');
  }
  const review = document.getElementById('importReview');
  if (review) review.hidden = true;
  const step = status?.closest('.import-step');
  if (step && !step.querySelector('.pdf-import-notice')) {
    const notice = document.createElement('div');
    notice.className = 'pdf-import-notice';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<strong>Import PDF en préparation</strong><br>Le bouton fonctionne, mais le moteur d’extraction PDF n’est pas encore activé. Choisissez un fichier CSV pour importer vos opérations aujourd’hui.';
    status.before(notice);
  }
}

function clearPdfNotice() {
  document.querySelector('.pdf-import-notice')?.remove();
}

function installPdfGuard() {
  document.addEventListener('change', event => {
    if (event.target?.id !== 'brokerImportFile') return;
    if (isPdf(selectedFile())) showPdfNotice();
    else clearPdfNotice();
  });

  document.addEventListener('click', event => {
    if (!event.target?.closest?.('#parseBrokerImport')) return;
    if (!isPdf(selectedFile())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showPdfNotice();
  }, true);
}

function installDialogViewportFix() {
  const update = () => {
    const dialog = document.getElementById('brokerImportDialog');
    if (!dialog) return;
    const viewport = window.visualViewport;
    if (viewport && window.matchMedia('(max-width: 760px)').matches) {
      dialog.style.setProperty('--leynor-visual-height', `${Math.round(viewport.height)}px`);
    }
  };
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('orientationchange', update);
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  update();
}

function installCloseButtonLabel() {
  const enhance = () => {
    const button = document.querySelector('[data-close-import]');
    if (!button || button.dataset.enhancedClose) return;
    button.dataset.enhancedClose = 'true';
    button.title = 'Fermer';
    button.setAttribute('aria-label', 'Fermer la fenêtre d’import');
  };
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
}

installPdfGuard();
installDialogViewportFix();
installCloseButtonLabel();

export { PDF_MESSAGE, isPdf, showPdfNotice };
