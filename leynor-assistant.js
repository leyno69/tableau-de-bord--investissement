import { buildAssistantRequest, createConversationMessage } from './leynor-conversation.js';

const API_TOKEN_KEY = 'invest-dashboard-api-token';
const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const CONVERSATION_KEY = 'leynor-conversation-history';

const state = {
  messages: loadMessages(),
  pending: false
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
    content: 'Bonjour, je suis LEYNOR. Je peux t’aider à comprendre ton portefeuille, tes performances et les mécanismes financiers. Par quoi souhaites-tu commencer ?'
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

function createInterface() {
  if (document.querySelector('#leynorPanel')) return;
  injectStylesheet();

  const launcher = document.createElement('button');
  launcher.id = 'leynorLauncher';
  launcher.className = 'leynor-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Ouvrir LEYNOR');
  launcher.textContent = 'L';

  const panel = document.createElement('section');
  panel.id = 'leynorPanel';
  panel.className = 'leynor-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Conversation avec LEYNOR');
  panel.innerHTML = `
    <header class="leynor-head">
      <div>
        <h2>LEYNOR</h2>
        <p>Votre copilote financier</p>
      </div>
      <span class="leynor-plan-badge">PREMIUM TEST</span>
      <button class="leynor-close" type="button" aria-label="Fermer">×</button>
    </header>
    <div id="leynorMessages" class="leynor-messages" aria-live="polite"></div>
    <form id="leynorForm" class="leynor-form">
      <button class="leynor-mic" type="button" aria-disabled="true" title="Conversation vocale Premium — bientôt disponible">🎙</button>
      <textarea id="leynorInput" rows="1" maxlength="2000" placeholder="Écrivez votre question…" aria-label="Votre message à LEYNOR"></textarea>
      <button id="leynorSend" class="leynor-send" type="submit" disabled>Envoyer</button>
    </form>`;

  document.body.append(panel, launcher);
  bindEvents();
  renderMessages();
}

function bindEvents() {
  const panel = document.querySelector('#leynorPanel');
  const launcher = document.querySelector('#leynorLauncher');
  const input = document.querySelector('#leynorInput');

  launcher.addEventListener('click', () => {
    panel.hidden = false;
    launcher.hidden = true;
    input.focus();
  });

  panel.querySelector('.leynor-close').addEventListener('click', () => {
    panel.hidden = true;
    launcher.hidden = false;
  });

  panel.querySelector('.leynor-mic').addEventListener('click', () => {
    appendTransientError('Le mode vocal Premium est préparé dans l’interface et sera activé lors de l’étape dédiée.');
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
      <article class="leynor-message assistant" aria-label="LEYNOR réfléchit">
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
  container.insertAdjacentHTML('beforeend', `<article class="leynor-message assistant error">${escapeHtml(message)}</article>`);
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
  document.querySelector('#leynorSend').disabled = true;
  persistMessages();
  renderMessages();

  try {
    const token = localStorage.getItem(API_TOKEN_KEY) || '';
    const response = await fetch('/leynor/assistant/answer', {
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
    if (!answer) throw new Error('LEYNOR n’a retourné aucune réponse.');
    state.messages.push(createConversationMessage({ role: 'assistant', content: answer }));
    persistMessages();
  } catch (error) {
    state.messages.push(createConversationMessage({
      role: 'assistant',
      content: `Je ne peux pas répondre pour le moment. ${error instanceof Error ? error.message : 'Vérifiez la connexion au serveur.'}`
    }));
  } finally {
    state.pending = false;
    renderMessages();
    input.focus();
  }
}

createInterface();
