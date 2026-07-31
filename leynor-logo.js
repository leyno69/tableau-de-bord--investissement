const CLASSIC_LOGO_PATH = './icons/leynor-icon.svg';
const PREMIUM_LOGO_PATH = './icons/leynor-laboratory-premium.svg';

function injectLogoStylesheet() {
  if (document.querySelector('link[data-leynor-logo]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './leynor-logo.css';
  link.dataset.leynorLogo = 'true';
  document.head.append(link);
}

function canonicalLogo({ className = 'leynor-canonical-logo', alt = '', premium = false } = {}) {
  const image = document.createElement('img');
  image.src = premium ? PREMIUM_LOGO_PATH : CLASSIC_LOGO_PATH;
  image.className = className;
  image.alt = alt;
  image.decoding = 'async';
  image.draggable = false;
  return image;
}

function replaceStaticMarks(root = document) {
  root.querySelectorAll('.brand-mark').forEach(mark => {
    if (mark.querySelector('img')) return;
    mark.replaceChildren(canonicalLogo({ className: 'leynor-canonical-logo brand-logo', alt: '' }));
  });

  root.querySelectorAll('.ai-orb').forEach(orb => {
    if (orb.querySelector('img')) return;
    orb.replaceChildren(canonicalLogo({ className: 'leynor-canonical-logo brief-logo', alt: '' }));
  });

  root.querySelectorAll('.leynor-presence-core').forEach(core => {
    if (core.querySelector('img')) return;
    core.replaceChildren(canonicalLogo({ className: 'leynor-canonical-logo assistant-logo', alt: '', premium: true }));
  });
}

injectLogoStylesheet();
replaceStaticMarks();

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) replaceStaticMarks(node);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

export { CLASSIC_LOGO_PATH, PREMIUM_LOGO_PATH, injectLogoStylesheet, replaceStaticMarks };
