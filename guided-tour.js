import { speakAnswer } from './leynor-assistant.js';

const TOUR_KEY = 'leynor-guided-tour-completed';
const STEPS = Object.freeze([
  {
    selector: '#overview',
    title: 'Bienvenue dans LEYNOR',
    text: 'Voici votre vue d’ensemble. Elle regroupe la valeur de votre patrimoine, son évolution et les informations qui méritent votre attention.'
  },
  {
    selector: '.topbar-actions',
    title: 'Connexion et actualisation',
    text: 'Ici, vous choisissez le courtier affiché, actualisez les données et ouvrez l’assistant LEYNOR pour poser une question par écrit ou à la voix.'
  },
  {
    selector: '.wealth-card',
    title: 'Patrimoine suivi',
    text: 'Cette carte présente la valeur consolidée du portefeuille, la plus ou moins-value et un aperçu de son évolution.'
  },
  {
    selector: '#portfolio',
    title: 'Votre portefeuille',
    text: 'La section portefeuille détaille chaque position, son courtier, son prix de revient, sa valeur actuelle et sa performance.'
  },
  {
    selector: '#radar',
    title: 'Radar et tendances',
    text: 'Le radar aide à surveiller des actifs, des secteurs et des signaux. Il sert à préparer une analyse, pas à déclencher automatiquement un achat.'
  },
  {
    selector: '#goals',
    title: 'Objectifs',
    text: 'Cette zone permet de suivre un objectif de long terme et, progressivement, de comparer votre trajectoire réelle à vos projections.'
  },
  {
    selector: '#assistant',
    title: 'Assistant LEYNOR',
    text: 'LEYNOR peut converser, expliquer un mécanisme financier, analyser un actif ou votre portefeuille, et lancer des simulations lorsque vous le demandez.'
  },
  {
    selector: '.assistant-trigger',
    title: 'À vous de jouer',
    text: 'La visite est terminée. Vous pouvez la relancer à tout moment avec le bouton Visite guidée. Commencez par poser une question à LEYNOR ou explorez votre portefeuille.'
  }
]);

let currentIndex = 0;
let activeElement = null;

function injectStylesheet() {
  if (document.querySelector('link[data-leynor-guided-tour]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './guided-tour.css';
  link.dataset.leynorGuidedTour = 'true';
  document.head.append(link);
}

function ensureLaunchButton() {
  if (document.querySelector('[data-start-guided-tour]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn secondary guided-tour-launch';
  button.dataset.startGuidedTour = 'true';
  button.textContent = '▶ Visite guidée';
  button.setAttribute('aria-label', 'Lancer la visite guidée vocale de LEYNOR');
  const actions = document.querySelector('.topbar-actions');
  if (actions) actions.append(button);
  else document.body.append(button);
  button.addEventListener('click', startTour);
}

function ensureInterface() {
  injectStylesheet();
  ensureLaunchButton();
  if (document.querySelector('#leynorGuidedTour')) return;
  const overlay = document.createElement('div');
  overlay.id = 'leynorGuidedTour';
  overlay.className = 'guided-tour';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="guided-tour-backdrop" aria-hidden="true"></div>
    <section class="guided-tour-card" role="dialog" aria-modal="true" aria-labelledby="guidedTourTitle">
      <div class="guided-tour-progress"><span id="guidedTourProgress"></span></div>
      <p class="eyebrow">VISITE GUIDÉE LEYNOR</p>
      <h2 id="guidedTourTitle"></h2>
      <p id="guidedTourText"></p>
      <div class="guided-tour-actions">
        <button type="button" class="btn secondary" data-tour-action="quit">Quitter</button>
        <button type="button" class="btn secondary" data-tour-action="previous">Précédent</button>
        <button type="button" class="btn" data-tour-action="next">Suivant</button>
      </div>
    </section>`;
  document.body.append(overlay);
  overlay.addEventListener('click', event => {
    const action = event.target.closest('[data-tour-action]')?.dataset.tourAction;
    if (action === 'quit') stopTour(false);
    if (action === 'previous') showStep(currentIndex - 1);
    if (action === 'next') currentIndex === STEPS.length - 1 ? stopTour(true) : showStep(currentIndex + 1);
  });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') stopTour(false);
    if (event.key === 'ArrowRight') currentIndex === STEPS.length - 1 ? stopTour(true) : showStep(currentIndex + 1);
    if (event.key === 'ArrowLeft') showStep(currentIndex - 1);
  });
}

function clearHighlight() {
  activeElement?.classList.remove('guided-tour-target');
  activeElement = null;
}

function showStep(index) {
  ensureInterface();
  currentIndex = Math.max(0, Math.min(STEPS.length - 1, index));
  const step = STEPS[currentIndex];
  clearHighlight();
  activeElement = document.querySelector(step.selector);
  if (activeElement) {
    activeElement.classList.add('guided-tour-target');
    activeElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
  document.querySelector('#guidedTourTitle').textContent = step.title;
  document.querySelector('#guidedTourText').textContent = step.text;
  document.querySelector('#guidedTourProgress').style.width = `${((currentIndex + 1) / STEPS.length) * 100}%`;
  const previous = document.querySelector('[data-tour-action="previous"]');
  const next = document.querySelector('[data-tour-action="next"]');
  previous.disabled = currentIndex === 0;
  next.textContent = currentIndex === STEPS.length - 1 ? 'Terminer' : 'Suivant';
  window.setTimeout(() => speakAnswer(`${step.title}. ${step.text}`), 220);
}

function startTour() {
  ensureInterface();
  const overlay = document.querySelector('#leynorGuidedTour');
  overlay.hidden = false;
  document.body.classList.add('guided-tour-active');
  showStep(0);
}

function stopTour(completed) {
  clearHighlight();
  globalThis.speechSynthesis?.cancel?.();
  const overlay = document.querySelector('#leynorGuidedTour');
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('guided-tour-active');
  if (completed) localStorage.setItem(TOUR_KEY, 'true');
}

function shouldOfferTour() {
  return localStorage.getItem(TOUR_KEY) !== 'true';
}

ensureInterface();
if (shouldOfferTour()) document.querySelector('[data-start-guided-tour]')?.classList.add('guided-tour-new');

export { TOUR_KEY, STEPS, startTour, stopTour, shouldOfferTour };
