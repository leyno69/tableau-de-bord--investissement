import { buildAssistantRequest, createConversationMessage } from './leynor-conversation.js';
import { buildFinancialCards, normalizeFinancialCards } from './leynor-financial-cards.js';

const API_TOKEN_KEY = 'invest-dashboard-api-token';
const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const CONVERSATION_KEY = 'leynor-conversation-history';
const VOICE_SETTINGS_KEY = 'leynor-voice-settings';
const PRESENCE_STATES = Object.freeze({
  idle: 'Disponible',
  listening: 'Je vous écoute…',
  thinking: 'J’analyse votre demande…',
  speaking: 'Je vous réponds…',
  error: 'Connexion à vérifier'
});

const VOICE_PREFERENCES = Object.freeze(['auto', 'female', 'male']);
const FEMALE_VOICE_PATTERN = /audrey|aurélie|aurelie|amelie|amélie|marie|hortense|virginie|julie|celine|céline|lea|léa|alice|sophie|claire|denise|eloise|éloïse|charlotte|isabelle|valerie|valérie/i;
const MALE_VOICE_PATTERN = /thomas|henri|paul|nicolas|antoine|luc|mathieu|pierre|alain|claude|daniel|gerard|gérard|jacques|jean|louis|remy|rémy/i;
const DEFAULT_VOICE_SETTINGS = Object.freeze({ rate: 0.94, pitch: 0.98, volume: 1, preference: 'female' });
const state = { messages: loadMessages(), pending: false, presence: 'idle', voiceEnabled: true, lastAnswer: '' };

function loadMessages() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONVERSATION_KEY) || '[]');
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {}
  return [createConversationMessage({
    role: 'assistant',
    content: 'Bonjour, je suis LEYNOR AI. Pose-moi une question librement : je peux converser, expliquer un sujet, analyser un actif, ton portefeuille ou lancer une simulation.'
  })];
}

function persistMessages() {
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(state.messages.slice(-40)));
}

function readPortfolio() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '{}'); } catch { return {}; }
}

function readVoiceSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(VOICE_SETTINGS_KEY) || '{}');
    return {
      rate: Number.isFinite(stored.rate) ? Math.min(1.08, Math.max(0.82, stored.rate)) : DEFAULT_VOICE_SETTINGS.rate,
      pitch: Number.isFinite(stored.pitch) ? Math.min(1.12, Math.max(0.86, stored.pitch)) : DEFAULT_VOICE_SETTINGS.pitch,
      volume: Number.isFinite(stored.volume) ? Math.min(1, Math.max(0.2, stored.volume)) : DEFAULT_VOICE_SETTINGS.volume,
      preference: VOICE_PREFERENCES.includes(stored.preference) ? stored.preference : DEFAULT_VOICE_SETTINGS.preference
    };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

function saveVoicePreference(preference) {
  const settings = readVoiceSettings();
  const normalized = VOICE_PREFERENCES.includes(preference) ? preference : DEFAULT_VOICE_SETTINGS.preference;
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify({ ...settings, preference: normalized }));
  return normalized;
}

function formatTime(value) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function injectStylesheet() {
  if (document.querySelector('link[data-leynor-assistant]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './leynor-assistant.css';
  link.dataset.leynorAssistant = 'true';
  document.head.append(link);
}

function inferredVoiceGender(voice) {
  const name = `${voice?.name || ''} ${voice?.voiceURI || ''}`;
  if (FEMALE_VOICE_PATTERN.test(name)) return 'female';
  if (MALE_VOICE_PATTERN.test(name)) return 'male';
  return 'unknown';
}

function voiceScore(voice, preference = 'auto') {
  const name = `${voice.name || ''} ${voice.voiceURI || ''}`.toLowerCase();
  const language = String(voice.lang || '').replace('_', '-').toLowerCase();
  let score = 0;
  if (language === 'fr-fr') score += 80;
  else if (language.startsWith('fr-')) score += 60;
  else return -1000;
  if (/premium|enhanced|natural|neural|studio|eloquence/.test(name)) score += 80;
  if (FEMALE_VOICE_PATTERN.test(name) || MALE_VOICE_PATTERN.test(name)) score += 35;
  const gender = inferredVoiceGender(voice);
  if (preference !== 'auto') {
    if (gender === preference) score += 120;
    else if (gender !== 'unknown') score -= 90;
  }
  if (/compact|basic|standard/.test(name)) score -= 25;
  if (voice.localService) score += 10;
  if (voice.default) score += 5;
  return score;
}

function chooseFrenchVoice(preference = readVoiceSettings().preference) {
  const voices = globalThis.speechSynthesis?.getVoices?.() || [];
  return voices
    .filter(voice => /^fr[-_]/i.test(voice.lang || ''))
    .sort((left, right) => voiceScore(right, preference) - voiceScore(left, preference))[0] || null;
}

function normalizeTextForSpeech(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' lien ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '. ')
    .replace(/^\s*\d+[.)]\s+/gm, '. ')
    .replace(/\*\*|__/g, '')
    .replace(/\*/g, '')
    .replace(/\bETF\b/g, 'E T F')
    .replace(/\bIA\b/g, 'I A')
    .replace(/\bPEA\b/g, 'P E A')
    .replace(/\bPER\b/g, 'P E R')
    .replace(/(\d)\s*%/g, '$1 pour cent')
    .replace(/(\d[\d\s.,]*)\s*€/g, '$1 euros')
    .replace(/\s*[:;]\s*/g, ', ')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakAnswer(text) {
  const normalized = normalizeTextForSpeech(text);
  if (!state.voiceEnabled || !normalized || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return false;
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalized);
  const settings = readVoiceSettings();
  utterance.lang = 'fr-FR';
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  const voice = chooseFrenchVoice(settings.preference);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'fr-FR';
  }
  utterance.onstart = () => setPresence('speaking');
  utterance.onend = () => setPresence('idle');
  utterance.onerror = () => setPresence('idle');
  state.lastAnswer = normalized;
  globalThis.speechSynthesis.speak(utterance);
  return true;
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

function cardMarkup(cards) {
  if (!cards?.length) return '';
  return `<div class="leynor-financial-cards" aria-label="Indicateurs financiers">${cards.map(card => `
    <div class="leynor-financial-card" data-tone="${card.tone}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
    </div>`).join('')}</div>`;
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

  const settings = readVoiceSettings();
  const panel = document.createElement('section');
  panel.id = 'leynorPanel';
  panel.className = 'leynor-panel';
  panel.hidden = true;
  panel.dataset.presence = state.presence;
  panel.dataset.directVoice = 'true';
  panel.setAttribute('aria-label', 'Conversation avec LEYNOR AI');
  panel.innerHTML = `
    <header class="leynor-head">
      <div class="leynor-identity">${presenceMarkup()}<div>
        <p class="leynor-kicker">LEYNOR AI</p>
        <h2>Votre copilote d’investissement</h2>
        <p id="leynorPresenceLabel" class="leynor-presence-label" aria-live="polite">${PRESENCE_STATES.idle}</p>
      </div></div>
      <button class="leynor-close" type="button" aria-label="Fermer">×</button>
    </header>
    <div class="leynor-welcome">
      <div><strong>Que souhaites-tu faire aujourd’hui ?</strong><span>Conversation libre, finance, portefeuille, stratégie, pédagogie ou simulation.</span></div>
      <label class="leynor-voice-choice" for="leynorVoicePreference">
        <span>Voix</span>
        <select id="leynorVoicePreference" aria-label="Choisir le type de voix de LEYNOR">
          <option value="female"${settings.preference === 'female' ? ' selected' : ''}>Féminine</option>
          <option value="male"${settings.preference === 'male' ? ' selected' : ''}>Masculine</option>
          <option value="auto"${settings.preference === 'auto' ? ' selected' : ''}>Automatique</option>
        </select>
      </label>
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
  const voicePreference = panel.querySelector('#leynorVoicePreference');

  launcher.addEventListener('click', () => { panel.hidden = false; launcher.hidden = true; input.focus(); });
  panel.querySelector('.leynor-close').addEventListener('click', () => { panel.hidden = true; launcher.hidden = false; globalThis.speechSynthesis?.cancel?.(); setPresence('idle'); });
  voicePreference.addEventListener('change', () => {
    const selected = saveVoicePreference(voicePreference.value);
    voicePreference.value = selected;
    globalThis.speechSynthesis?.cancel?.();
    speakAnswer(selected === 'female' ? 'La voix féminine est sélectionnée.' : selected === 'male' ? 'La voix masculine est sélectionnée.' : 'La sélection automatique de la voix est activée.');
  });
  input.addEventListener('input', () => {
    state.voiceEnabled = true;
    document.querySelector('#leynorSend').disabled = state.pending || !input.value.trim();
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); panel.querySelector('#leynorForm').requestSubmit(); }
  });
  panel.querySelector('#leynorForm').addEventListener('submit', sendMessage);
  panel.querySelector('#leynorMessages').addEventListener('click', event => {
    const replay = event.target.closest('[data-replay-message]');
    if (!replay) return;
    const index = Number(replay.dataset.replayMessage);
    const message = state.messages[index];
    if (message?.role === 'assistant') speakAnswer(message.content);
  });
}

function renderMessages() {
  const container = document.querySelector('#leynorMessages');
  if (!container) return;
  container.innerHTML = state.messages.map((message, index) => `
    <article class="leynor-message ${message.role}">
      <div>${escapeHtml(message.content)}</div>
      ${message.role === 'assistant' ? cardMarkup(normalizeFinancialCards(message.cards)) : ''}
      <footer class="leynor-message-footer"><small>${formatTime(message.createdAt)}</small>${message.role === 'assistant' ? `<button type="button" class="leynor-replay" data-replay-message="${index}" aria-label="Réécouter cette réponse">🔊 Réécouter</button>` : ''}</footer>
    </article>`).join('');
  if (state.pending) container.insertAdjacentHTML('beforeend', `
    <article class="leynor-message assistant leynor-thinking-message" aria-label="LEYNOR AI réfléchit">
      ${presenceMarkup({ compact: true })}<span>Analyse en cours</span><span class="leynor-typing"><span></span><span></span><span></span></span>
    </article>`);
  container.scrollTop = container.scrollHeight;
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

  state.voiceEnabled = true;
  globalThis.speechSynthesis?.cancel?.();
  const portfolio = readPortfolio();
  const previousConversation = state.messages.slice(-8);
  state.messages.push(createConversationMessage({ role: 'user', content: question }));
  input.value = '';
  input.style.height = 'auto';
  state.pending = true;
  setPresence('thinking');
  document.querySelector('#leynorSend').disabled = true;
  persistMessages();
  renderMessages();

  let answerToSpeak = '';
  try {
    const token = localStorage.getItem(API_TOKEN_KEY) || '';
    const response = await fetch('./leynor/assistant/answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(buildAssistantRequest({ question, portfolio, conversation: previousConversation }))
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `Erreur LEYNOR (${response.status})`);
    const answer = payload?.data?.answer;
    if (!answer) throw new Error('LEYNOR AI n’a retourné aucune réponse.');
    const cards = normalizeFinancialCards(payload?.data?.cards?.length ? payload.data.cards : buildFinancialCards(portfolio));
    state.messages.push(Object.freeze({ ...createConversationMessage({ role: 'assistant', content: answer }), cards }));
    answerToSpeak = answer;
    persistMessages();
  } catch (error) {
    setPresence('error');
    const failure = `Je ne peux pas répondre pour le moment. ${error instanceof Error ? error.message : 'Vérifiez la connexion au serveur.'}`;
    state.messages.push(createConversationMessage({ role: 'assistant', content: failure }));
    answerToSpeak = failure;
  } finally {
    state.pending = false;
    renderMessages();
    if (!speakAnswer(answerToSpeak)) window.setTimeout(() => setPresence('idle'), 1200);
    input.focus();
  }
}

createInterface();
export { PRESENCE_STATES, VOICE_PREFERENCES, setPresence, inferredVoiceGender, voiceScore, chooseFrenchVoice, normalizeTextForSpeech, speakAnswer };
