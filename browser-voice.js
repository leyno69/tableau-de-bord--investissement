const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const BUILD_ID = 'beta-20260801-brand-pronunciation';

let recognition = null;
let speechPatched = false;
let speechUnlocked = false;

function normalizeBrandPronunciation(text) {
  return String(text || '')
    .replace(/\bLEYNOR\s+AI\b/gi, 'Lé-ï-nor, A, I')
    .replace(/\bLEYNOR\s+(?:A\s*I|IA)\b/gi, 'Lé-ï-nor, A, I')
    .replace(/\bLEYNOR\b/gi, 'Lé-ï-nor');
}

function unlockSpeechSynthesis() {
  if (speechUnlocked || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return speechUnlocked;
  try {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.lang = 'fr-FR';
    utterance.volume = 0.01;
    utterance.rate = 1;
    globalThis.speechSynthesis.speak(utterance);
    speechUnlocked = true;
  } catch {
    speechUnlocked = false;
  }
  return speechUnlocked;
}

function patchSpeechSynthesisPronunciation() {
  const synthesis = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (speechPatched || !synthesis?.speak || !Utterance) return false;
  const originalSpeak = synthesis.speak.bind(synthesis);
  synthesis.speak = utterance => {
    const normalized = normalizeBrandPronunciation(utterance?.text);
    if (!utterance || normalized === utterance.text) return originalSpeak(utterance);
    const replacement = new Utterance(normalized);
    replacement.lang = utterance.lang;
    replacement.voice = utterance.voice;
    replacement.rate = utterance.rate;
    replacement.pitch = utterance.pitch;
    replacement.volume = utterance.volume;
    replacement.onstart = utterance.onstart;
    replacement.onend = utterance.onend;
    replacement.onerror = utterance.onerror;
    replacement.onpause = utterance.onpause;
    replacement.onresume = utterance.onresume;
    replacement.onmark = utterance.onmark;
    replacement.onboundary = utterance.onboundary;
    return originalSpeak(replacement);
  };
  speechPatched = true;
  return true;
}

function assistantElements() {
  return {
    panel: document.querySelector('#leynorPanel'),
    mic: document.querySelector('#leynorPanel .leynor-mic'),
    input: document.querySelector('#leynorInput'),
    form: document.querySelector('#leynorForm'),
    messages: document.querySelector('#leynorMessages')
  };
}

function appendNotice(message) {
  const container = assistantElements().messages;
  if (!container) return;
  const notice = document.createElement('article');
  notice.className = 'leynor-message assistant notice';
  notice.textContent = message;
  container.append(notice);
  container.scrollTop = container.scrollHeight;
}

function setListening(active) {
  const { mic, input, panel } = assistantElements();
  if (!mic || !input) return;
  mic.setAttribute('aria-pressed', String(active));
  input.placeholder = active ? 'LEYNOR AI vous écoute…' : 'Écrivez votre question…';
  if (panel) panel.dataset.presence = active ? 'listening' : 'idle';
}

function chooseFrenchVoice() {
  const voices = globalThis.speechSynthesis?.getVoices?.() || [];
  return voices.find(voice => /^fr[-_]/i.test(voice.lang) && /premium|enhanced|natural/i.test(voice.name))
    || voices.find(voice => /^fr[-_]/i.test(voice.lang))
    || null;
}

function submitTranscript(transcript) {
  const { input, form } = assistantElements();
  const text = String(transcript || '').trim();
  if (!input || !form || !text) return;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.dataset.voiceSubmission = 'true';
  form.requestSubmit();
}

function createRecognition() {
  if (!SpeechRecognition) return null;
  const instance = new SpeechRecognition();
  instance.lang = 'fr-FR';
  instance.continuous = false;
  instance.interimResults = true;
  instance.maxAlternatives = 1;
  instance.onresult = event => {
    let interim = '';
    let finalText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0]?.transcript || '';
      if (event.results[index].isFinal) finalText += text;
      else interim += text;
    }
    const { input } = assistantElements();
    if (input) {
      input.value = (finalText || interim).trim();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (finalText.trim()) submitTranscript(finalText);
  };
  instance.onerror = event => {
    setListening(false);
    const messages = {
      'not-allowed': 'Autorise le microphone dans les réglages du navigateur pour utiliser le chat vocal.',
      'audio-capture': 'Aucun microphone utilisable n’a été détecté.',
      'no-speech': 'Je n’ai pas entendu de phrase. Appuie de nouveau sur le micro pour réessayer.'
    };
    appendNotice(messages[event.error] || `Le chat vocal est indisponible (${event.error || 'erreur inconnue'}).`);
  };
  instance.onend = () => setListening(false);
  return instance;
}

function handleMic(event) {
  const { mic } = assistantElements();
  if (!mic) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  unlockSpeechSynthesis();

  if (!SpeechRecognition) {
    appendNotice('La reconnaissance vocale n’est pas prise en charge par ce navigateur. Utilise Chrome, Edge ou Safari récent.');
    return;
  }

  recognition ||= createRecognition();
  const active = mic.getAttribute('aria-pressed') === 'true';
  if (active) {
    recognition.stop();
    setListening(false);
    return;
  }

  try {
    globalThis.speechSynthesis?.cancel?.();
    recognition.start();
    setListening(true);
  } catch (error) {
    setListening(false);
    appendNotice(error instanceof Error ? error.message : 'Impossible de démarrer le microphone.');
  }
}

function initializeBrowserVoice() {
  patchSpeechSynthesisPronunciation();
  document.documentElement.dataset.leynorBuild = BUILD_ID;
  const { mic } = assistantElements();
  if (!mic || mic.dataset.browserVoice === 'true') return false;
  mic.dataset.browserVoice = 'true';
  mic.title = SpeechRecognition ? 'Parler à LEYNOR AI' : 'Reconnaissance vocale non prise en charge';
  mic.addEventListener('click', handleMic, { capture: true });
  return true;
}

function waitForAssistant() {
  patchSpeechSynthesisPronunciation();
  if (initializeBrowserVoice()) return;
  const observer = new MutationObserver(() => {
    if (initializeBrowserVoice()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

waitForAssistant();

export { BUILD_ID, initializeBrowserVoice, chooseFrenchVoice, submitTranscript, normalizeBrandPronunciation, patchSpeechSynthesisPronunciation, unlockSpeechSynthesis };
