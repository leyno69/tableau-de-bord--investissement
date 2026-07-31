import { buildAssistantRequest, createConversationMessage } from './leynor-conversation.js';

const API_TOKEN_KEY = 'invest-dashboard-api-token';
const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const CONVERSATION_KEY = 'leynor-conversation-history';
const PRESENCE_STATES = Object.freeze({
  idle: 'Disponible',
  listening: 'Je vous écoute…',
  thinking: 'J’analyse votre demande…',
  speaking: 'Je vous réponds…',
  error: 'Connexion à vérifier'
});

const state = {
  messages: loadMessages(),
  pending: false,
  presence: 'idle'
};

function loadMessages() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONVERSATION_KEY) || '[]');
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // A damaged local history must never block the assistant.
  }
  return [createConversationMessage({
    role: 'assistant',
    content: 'Bonjour, je suis LEYNOR AI. Je peux t’aider à comprendre ton portefeuille, tes performances et les mécanismes financiers. Que souhaites-tu analyser aujourd’hui ?'
  })];
}

function persistMessages() {
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(state.messages.slice(-40)));
}

function readPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '{}');
  } catch {
    return {};
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function injectStylesheet() {
  if (document.querySelector('link[data-leynor-assistant]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './leynor-assistant.css';
  link.dataset.leynorAssistant = 'true';
  document.head.append(link);
}

function presenceMarkup({ compact = false } = {}) {
  return `<span class="leynor-presence${compact ? ' compact' : ''}" aria-hidden="true">
    <span class="leynor-presence-halo"></span>
    <span class="leynor-presence-core">
      <span class="leynor-presence-letter">L</span>
      <span class="leynor-presence-curve"></span>
      <span class="leynor-star leynor-star-one">✦</span>
      <span class="leynor-star leynor-star-two">✦</span>
    </span>
    <span class="leynor-wave leynor-wave-one"></span>
    <span class="leynor-wave leynor-wave-two"></span>
  </span>`;
}

function createInterface() {
  if (document.querySelector('#leynorPanel')) return;
  injectStylesheet();

  const launcher = document.createElement('button');
  launcher.id = 'leynorLauncher';
  launcher.className = 'leynor-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Ouvrir LEYNOR AI');
  launcher.innerHTML = presenceMarkup({ compact: true });

  const panel = document.createElement('section');
  panel.id = 'leynorPanel';
  panel.className = 'leynor-panel';
  panel.hidden = true;
  panel.dataset.presence = state.presence;
  panel.setAttribute('aria-label', 'Conversation avec LEYNOR AI');
  panel.innerHTML = `
    <header class="leynor-head">
      <div class="leynor-identity">
        ${presenceMarkup()}
        <div>
          <p class="leynor-kicker">LEYNOR AI</p>
          <h2>Votre copilote d’investissement</h2>
          <p id="leynorPresenceLabel" class="leynor-presence-label" aria-live="polite">${PRESENCE_STATES.idle}</p>
        </div>
      </div>
      <button class="leynor-close" type="button" aria-label="Fermer">×</button>
    </header>
    <div class="leynor-welcome">
      <strong>Que souhaites-tu analyser aujourd’hui ?</strong>
      <span>Portefeuille, stratégie, risque ou compréhension d’un mécanisme financier.</span>
    </div>
    <div id="leynorMessages" class="leynor-messages" aria-live="polite"></div>
    <form id="leynorForm" class="leynor-form">
      <button class="leynor-mic" type="button" aria-pressed="false" title="Activer l’écoute LEYNOR AI"><span aria-hidden="true">◉</span><span class="sr-only">Activer l’écoute</span></button>
      <textarea id="leynorInput" rows="1" maxlength="2000" placeholder="Écrivez votre question…" aria-label="Votre message à LEYNOR AI"></textarea>
      <button id="leynorSend" class="leynor-send" type="submit" disabled>Envoyer</button>
    </form>`;

  document.body.append(panel, launcher);
  bindEvents();
  renderMessages();
  setPresence('idle');
}

function setPresence(nextPresence) {
  const normalized = PRESENCE_STATES[nextPresence] ? nextPresence : 'idle';
  state.presence = normalized;
  const panel = document.querySelector('#leynorPanel');
  const launcher = document.querySelector('#leynorLauncher');
  if (panel) panel.dataset.presence = normalized;
  if (launcher) launcher.dataset.presence = normalized;
  const label = document.querySelector('#leynorPresenceLabel');
  if (label) label.textContent = PRESENCE_STATES[normalized];
}

function bindEvents() {
  const panel = document.querySelector('#leynorPanel');
  const launcher = document.querySelector('#leynorLauncher');
  const input = document.querySelector('#leynorInput');
  const mic = panel.querySelector('.leynor-mic');

  launcher.addEventListener('click', () => {
    panel.hidden = false;
    launcher.hidden = true;
    input.focus();
  });

  panel.querySelector('.leynor-close').addEventListener('click', () => {
    panel.hidden = true;
    launcher.hidden = false;
    setPresence('idle');
  });

  mic.addEventListener('click', () => {
    const listening = mic.getAttribute('aria-pressed') !== 'true';
    mic.setAttribute('aria-pressed', String(listening));
    setPresence(listening ? 'listening' : 'idle');
    if (listening) {
      input.placeholder = 'LEYNOR AI vous écoute…';
      window.setTimeout(() => {
        if (mic.getAttribute('aria-pressed') === 'true') {
          mic.setAttribute('aria-pressed', 'false');
          input.placeholder = 'Écrivez votre question…';
          setPresence('idle');
          appendTransientError('Le module vocal est prêt visuellement. La transcription sera activée avec le fournisseur vocal dédié.');
        }
      }, 4500);
    } else {
      input.placeholder = 'Écrivez votre question…';
    }
  });

  input.addEventListener('input', () => {
    document.querySelector('#leynorSend').disabled = state.pending || !input.value.trim();
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      panel.querySelector('#leynorForm').requestSubmit();
    }
  });

  panel.querySelector('#leynorForm').addEventListener('submit', sendMessage);
}

function renderMessages() {
  const container = document.querySelector('#leynorMessages');
  if (!container) return;
  container.innerHTML = state.messages.map(message => `
    <article class="leynor-message ${message.role}">
      ${escapeHtml(message.content)}
      <small>${formatTime(message.createdAt)}</small>
    </article>`).join('');

  if (state.pending) {
    container.insertAdjacentHTML('beforeend', `
      <article class="leynor-message assistant leynor-thinking-message" aria-label="LEYNOR AI réfléchit">
        ${presenceMarkup({ compact: true })}
        <span>Analyse en cours</span>
        <span class="leynor-typing"><span></span><span></span><span></span></span>
      </article>`);
  }
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function appendTransientError(message) {
  const container = document.querySelector('#leynorMessages');
  container.insertAdjacentHTML('beforeend', `<article class="leynor-message assistant notice">${escapeHtml(message)}</article>`);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage(event) {
  event.preventDefault();
  if (state.pending) return;

  const input = document.querySelector('#leynorInput');
  const question = input.value.trim();
  if (!question) return;

  const previousConversation = state.messages.slice(-8);
  state.messages.push(createConversationMessage({ role: 'user', content: question }));
  input.value = '';
  input.style.height = 'auto';
  state.pending = true;
  setPresence('thinking');
  document.querySelector('#leynorSend').disabled = true;
  persistMessages();
  renderMessages();

  try {
    const token = localStorage.getItem(API_TOKEN_KEY) || '';
    const response = await fetch('./leynor/assistant/answer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(buildAssistantRequest({
        question,
        portfolio: readPortfolio(),
        conversation: previousConversation
      }))
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || `Erreur LEYNOR (${response.status})`);
    }

    const answer = payload?.data?.answer;
    if (!answer) throw new Error('LEYNOR AI n’a retourné aucune réponse.');
    setPresence('speaking');
    state.messages.push(createConversationMessage({ role: 'assistant', content: answer }));
    persistMessages();
  } catch (error) {
    setPresence('error');
    state.messages.push(createConversationMessage({
      role: 'assistant',
      content: `Je ne peux pas répondre pour le moment. ${error instanceof Error ? error.message : 'Vérifiez la connexion au serveur.'}`
    }));
  } finally {
    state.pending = false;
    renderMessages();
    window.setTimeout(() => setPresence('idle'), state.presence === 'speaking' ? 1800 : 2600);
    input.focus();
  }
}

createInterface();

export { PRESENCE_STATES, setPresence };
