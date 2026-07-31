const LOGO_PATH = './icons/leynor-icon.svg';

function canonicalLogo({ className = 'leynor-canonical-logo', alt = '' } = {}) {
  const image = document.createElement('img');
  image.src = LOGO_PATH;
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
    core.replaceChildren(canonicalLogo({ className: 'leynor-canonical-logo assistant-logo', alt: '' }));
  });
}

replaceStaticMarks();

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) replaceStaticMarks(node);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

export { LOGO_PATH, replaceStaticMarks };
