import './leynor-logo.js';

const BRAND_STYLESHEET_ID = 'leynor-brand-styles';

function ensureStylesheet() {
  if (document.querySelector(`#${BRAND_STYLESHEET_ID}`)) return;
  const link = document.createElement('link');
  link.id = BRAND_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = 'leynor-brand.css';
  document.head.append(link);
}

function ensureMetadata() {
  document.title = 'LEYNOR — Votre copilote d’investissement';
  const description = document.querySelector('meta[name="description"]') || document.createElement('meta');
  description.name = 'description';
  description.content = 'LEYNOR, votre copilote d’investissement pour analyser, simuler et piloter votre portefeuille.';
  if (!description.parentNode) document.head.append(description);

  const themeColor = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#07111f';
  if (!themeColor.parentNode) document.head.append(themeColor);
}

function openUnifiedAssistant(event) {
  const launcher = document.querySelector('#leynorLauncher');
  const panel = document.querySelector('#leynorPanel');
  if (!launcher || !panel) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (panel.hidden) launcher.click();
  else document.querySelector('#leynorInput')?.focus({ preventScroll: true });
}

function bindUnifiedAssistantTrigger(element) {
  if (!element || element.dataset.unifiedLeynorAssistant === 'true') return;
  element.dataset.unifiedLeynorAssistant = 'true';
  element.addEventListener('click', openUnifiedAssistant, { capture: true });
}

function refineBrandCopy() {
  const subtitle = document.querySelector('.brand small');
  if (subtitle) subtitle.textContent = 'Votre copilote d’investissement';

  document.querySelectorAll('.assistant-trigger, a[href="#assistant"], .ai-brief .text-button').forEach(element => {
    bindUnifiedAssistantTrigger(element);
    if (element.classList.contains('assistant-trigger')) {
      element.innerHTML = '<span aria-hidden="true">✦</span> Parler à LEYNOR AI';
      element.setAttribute('aria-label', 'Ouvrir l’assistant conversationnel et vocal LEYNOR AI');
    }
  });

  const orb = document.querySelector('.ai-orb');
  if (orb) {
    orb.textContent = '';
    orb.setAttribute('aria-label', 'LEYNOR AI est disponible');
    orb.setAttribute('role', 'img');
  }
}

function initLeynorBrand() {
  ensureStylesheet();
  ensureMetadata();
  refineBrandCopy();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeynorBrand, { once: true });
} else {
  initLeynorBrand();
}
