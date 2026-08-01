const STEP_DEFINITIONS = [
  { key: 'broker', label: 'Courtier', selector: '#importBroker' },
  { key: 'file', label: 'Fichier', selector: '#brokerImportFile' },
  { key: 'analysis', label: 'Analyse', selector: '#brokerImportStatus' },
  { key: 'review', label: 'Vérification', selector: '[data-import-review], .import-preview, .import-results, #brokerImportPreview' },
  { key: 'done', label: 'Terminé', selector: '[data-import-success], .import-success' }
];

function getDialog() {
  return document.getElementById('brokerImportDialog');
}

function getShell(dialog = getDialog()) {
  return dialog?.querySelector('.import-shell') || dialog?.querySelector('[role="document"]') || dialog?.firstElementChild || null;
}

function stepTitle(step) {
  const titles = {
    broker: 'Choisissez votre courtier',
    file: 'Sélectionnez votre fichier',
    analysis: 'Analyse du document',
    review: 'Vérifiez les opérations',
    done: 'Import terminé'
  };
  return titles[step] || 'Importer un portefeuille';
}

function findRelevantContainer(shell, selector) {
  const target = shell.querySelector(selector);
  if (!target) return null;
  return target.closest('.import-step, section, fieldset, .form-group, .card') || target.parentElement;
}

function buildWizard(shell) {
  if (shell.dataset.importWizardMounted === 'true') return;
  shell.dataset.importWizardMounted = 'true';
  shell.classList.add('import-wizard');

  const header = document.createElement('div');
  header.className = 'import-wizard__header';
  header.innerHTML = `
    <div>
      <p class="import-wizard__eyebrow">IMPORT DE PORTEFEUILLE</p>
      <h2 id="importWizardTitle">${stepTitle('broker')}</h2>
    </div>
    <div class="import-wizard__progress" aria-label="Progression de l’import">
      ${STEP_DEFINITIONS.map((step, index) => `<button type="button" class="import-wizard__dot" data-wizard-jump="${index}" aria-label="Étape ${index + 1} : ${step.label}"><span>${index + 1}</span><small>${step.label}</small></button>`).join('')}
    </div>`;

  const body = document.createElement('div');
  body.className = 'import-wizard__body';

  const footer = document.createElement('div');
  footer.className = 'import-wizard__footer';
  footer.innerHTML = `
    <button type="button" class="btn secondary" data-wizard-back>Précédent</button>
    <div class="import-wizard__footer-spacer"></div>
    <button type="button" class="btn secondary" data-close-import-footer>Fermer</button>
    <button type="button" class="btn primary" data-wizard-next>Continuer</button>`;

  const closeButton = shell.querySelector('[data-close-import]');
  const originalChildren = [...shell.children].filter(node => node !== closeButton);
  originalChildren.forEach(node => body.append(node));
  if (closeButton) shell.append(closeButton);
  shell.prepend(header);
  shell.append(body, footer);

  const panels = STEP_DEFINITIONS.map((step, index) => {
    const container = findRelevantContainer(body, step.selector);
    if (!container) return null;
    container.dataset.wizardPanel = String(index);
    container.classList.add('import-wizard__panel');
    return container;
  });

  const assigned = new Set(panels.filter(Boolean));
  [...body.children].forEach(node => {
    if (assigned.has(node) || node.id === 'brokerImportGuide') return;
    const closestPanel = node.closest?.('[data-wizard-panel]');
    if (!closestPanel && !node.matches?.('script, style')) {
      const fallback = panels[1] || panels[0];
      if (fallback && node !== fallback) fallback.append(node);
    }
  });

  let current = 0;

  function selectedFile() {
    return shell.querySelector('#brokerImportFile')?.files?.[0] || null;
  }

  function canAdvance(index) {
    if (index === 0) return Boolean(shell.querySelector('#importBroker')?.value);
    if (index === 1) return Boolean(selectedFile());
    if (index === 2) {
      const status = shell.querySelector('#brokerImportStatus');
      return !status || /prêt|analys|opération|succès|termin/i.test(status.textContent || '');
    }
    return true;
  }

  function show(index, { focus = true } = {}) {
    current = Math.max(0, Math.min(STEP_DEFINITIONS.length - 1, index));
    shell.dataset.wizardStep = String(current);
    const title = shell.querySelector('#importWizardTitle');
    if (title) title.textContent = stepTitle(STEP_DEFINITIONS[current].key);

    panels.forEach((panel, panelIndex) => {
      if (!panel) return;
      const active = panelIndex === current;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });

    shell.querySelectorAll('[data-wizard-jump]').forEach((button, buttonIndex) => {
      button.classList.toggle('is-active', buttonIndex === current);
      button.classList.toggle('is-complete', buttonIndex < current);
      button.setAttribute('aria-current', buttonIndex === current ? 'step' : 'false');
    });

    const back = shell.querySelector('[data-wizard-back]');
    const next = shell.querySelector('[data-wizard-next]');
    if (back) back.disabled = current === 0;
    if (next) {
      next.textContent = current >= STEP_DEFINITIONS.length - 1 ? 'Terminer' : 'Continuer';
      next.disabled = !canAdvance(current);
    }

    body.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) title?.focus?.({ preventScroll: true });
  }

  shell.querySelector('[data-wizard-back]')?.addEventListener('click', () => show(current - 1));
  shell.querySelector('[data-wizard-next]')?.addEventListener('click', () => {
    if (!canAdvance(current)) return;
    if (current >= STEP_DEFINITIONS.length - 1) {
      closeButton?.click();
      return;
    }
    show(current + 1);
  });
  shell.querySelector('[data-close-import-footer]')?.addEventListener('click', () => closeButton?.click());
  shell.querySelectorAll('[data-wizard-jump]').forEach(button => button.addEventListener('click', () => {
    const requested = Number(button.dataset.wizardJump);
    if (requested <= current || STEP_DEFINITIONS.slice(0, requested).every((_, index) => canAdvance(index))) show(requested);
  }));

  shell.addEventListener('change', event => {
    if (event.target?.id === 'importBroker' || event.target?.id === 'brokerImportFile') show(current, { focus: false });
  });
  shell.addEventListener('input', () => show(current, { focus: false }));

  const observer = new MutationObserver(() => {
    if (shell.dataset.wizardStep == null) return;
    show(Number(shell.dataset.wizardStep), { focus: false });
  });
  observer.observe(body, { childList: true, subtree: true, characterData: true });

  show(0, { focus: false });
}

function ensureAssets() {
  if (!document.querySelector('link[data-import-wizard]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'broker-import-wizard.css';
    link.dataset.importWizard = 'true';
    document.head.append(link);
  }
}

function mount() {
  ensureAssets();
  const shell = getShell();
  if (shell) buildWizard(shell);
}

const observer = new MutationObserver(mount);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', mount);
mount();

export { STEP_DEFINITIONS, buildWizard, mount };
