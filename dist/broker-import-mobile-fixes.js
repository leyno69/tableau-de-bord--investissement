const PDF_READY_MESSAGE = 'PDF sélectionné. LEYNOR va analyser localement sa couche texte avec Mozilla PDF.js. Les PDF scannés sans texte nécessitent encore un OCR.';

function selectedFile() {
  return document.getElementById('brokerImportFile')?.files?.[0] || null;
}

function isPdf(file) {
  return Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')));
}

function showPdfReadiness() {
  const status = document.getElementById('brokerImportStatus');
  if (status) {
    status.textContent = PDF_READY_MESSAGE;
    status.classList.remove('warning', 'success');
  }
  const step = status?.closest('.import-step');
  let notice = step?.querySelector('.pdf-import-notice');
  if (step && !notice) {
    notice = document.createElement('div');
    notice.className = 'pdf-import-notice';
    notice.setAttribute('role', 'status');
    status.before(notice);
  }
  if (notice) {
    notice.innerHTML = '<strong>Import PDF activé</strong><br>Le document reste sur cet appareil pendant l’analyse. Si le relevé est une image scannée, utilisez temporairement un PDF texte ou un CSV.';
  }
}

function clearPdfNotice() {
  document.querySelector('.pdf-import-notice')?.remove();
}

function installPdfFeedback() {
  document.addEventListener('change', event => {
    if (event.target?.id !== 'brokerImportFile') return;
    if (isPdf(selectedFile())) showPdfReadiness();
    else clearPdfNotice();
  });
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

installPdfFeedback();
installDialogViewportFix();
installCloseButtonLabel();

export { PDF_READY_MESSAGE, isPdf, showPdfReadiness };
