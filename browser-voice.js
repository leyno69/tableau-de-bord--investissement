const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const BUILD_ID = 'beta-20260801-brand-pronunciation-v2';
const PRONUNCIATION_REFERENCE = 'Lainor, A I';
const VOICE_SETTINGS_KEY = 'leynor-voice-settings';
const FEMALE_VOICE_PATTERN = /audrey|aurélie|aurelie|amelie|amélie|marie|hortense|virginie|julie|celine|céline|lea|léa|alice|sophie|claire|denise|eloise|éloïse|charlotte|isabelle|valerie|valérie/i;
const MALE_VOICE_PATTERN = /thomas|henri|paul|nicolas|antoine|luc|mathieu|pierre|alain|claude|daniel|gerard|gérard|jacques|jean|louis|remy|rémy|bernard|yves|françois|francois/i;

let recognition = null;
let speechPatched = false;
let speechUnlocked = false;
let unavailablePreferenceNotice = '';

function normalizeBrandPronunciation(text) {
  return String(text || '')
    .replace(/\bLEYNOR\s+(?:AI|A\s*I|IA)\b/gi, 'Lainor, A, I')
    .replace(/\bLEYNOR\b/gi, 'Lainor');
}

function readVoicePreference() {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(VOICE_SETTINGS_KEY) || '{}');
    return ['female', 'male', 'auto'].includes(stored.preference) ? stored.preference : 'female';
  } catch {
    return 'female';
  }
}

function inferredVoiceGender(voice) {
  const identity = `${voice?.name || ''} ${voice?.voiceURI || ''}`;
  if (FEMALE_VOICE_PATTERN.test(identity)) return 'female';
  if (MALE_VOICE_PATTERN.test(identity)) return 'male';
  return 'unknown';
}

function voiceQualityScore(voice) {
  const identity = `${voice?.name || ''} ${voice?.voiceURI || ''}`.toLowerCase();
  const language = String(voice?.lang || '').replace('_', '-').toLowerCase();
  let score = language === 'fr-fr' ? 80 : language.startsWith('fr-') ? 60 : -1000;
  if (/premium|enhanced|natural|neural|studio|eloquence/.test(identity)) score += 80;
  if (/compact|basic|standard/.test(identity)) score -= 25;
  if (voice?.localService) score += 10;
  if (voice?.default) score += 5;
  return score;
}

function choosePreferredFrenchVoice(preference = readVoicePreference(), voices = globalThis.speechSynthesis?.getVoices?.() || []) {
  const french = voices.filter(voice => /^fr[-_]/i.test(voice?.lang || ''));
  if (!french.length) return null;
  if (preference === 'auto') return [...french].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a))[0] || null;
  const matching = french.filter(voice => inferredVoiceGender(voice) === preference);
  return [...matching].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a))[0] || null;
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

function appendNotice(message) {
  const container = assistantElements().messages;
  if (!container) return;
  const notice = document.createElement('article');
  notice.className = 'leynor-message assistant notice';
  notice.textContent = message;
  container.append(notice);
  container.scrollTop = container.scrollHeight;
}

function reportUnavailablePreference(preference) {
  if (!['female', 'male'].includes(preference) || unavailablePreferenceNotice === preference) return;
  unavailablePreferenceNotice = preference;
  const label = preference === 'male' ? 'masculine' : 'féminine';
  appendNotice(`Aucune voix française ${label} identifiable n’est installée sur cet appareil. LEYNOR conserve votre choix et n’utilise pas silencieusement une autre voix.`);
}

function patchSpeechSynthesisPronunciation() {
  const synthesis = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (speechPatched || !synthesis?.speak || !Utterance) return false;
  const originalSpeak = synthesis.speak.bind(synthesis);
  synthesis.speak = utterance => {
    if (!utterance) return originalSpeak(utterance);
    const normalized = normalizeBrandPronunciation(utterance.text);
    const replacement = new Utterance(normalized);
    replacement.lang = utterance.lang || 'fr-FR';
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

    const preference = readVoicePreference();
    const preferredVoice = choosePreferredFrenchVoice(preference);
    if (preference !== 'auto' && !preferredVoice) {
      reportUnavailablePreference(preference);
      utterance.onerror?.({ error: 'voice-unavailable' });
      return undefined;
    }
    replacement.voice = preferredVoice || utterance.voice || null;
    if (replacement.voice?.lang) replacement.lang = replacement.voice.lang;
    unavailablePreferenceNotice = '';
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

function setListening(active) {
  const { mic, input, panel } = assistantElements();
  if (!mic || !input) return;
  mic.setAttribute('aria-pressed', String(active));
  input.placeholder = active ? 'LEYNOR AI vous écoute…' : 'Écrivez votre question…';
  if (panel) panel.dataset.presence = active ? 'listening' : 'idle';
}

function chooseFrenchVoice() {
  return choosePreferredFrenchVoice('auto');
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
  document.documentElement.dataset.leynorPronunciation = PRONUNCIATION_REFERENCE;
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

export { BUILD_ID, PRONUNCIATION_REFERENCE, initializeBrowserVoice, chooseFrenchVoice, choosePreferredFrenchVoice, inferredVoiceGender, readVoicePreference, submitTranscript, normalizeBrandPronunciation, patchSpeechSynthesisPronunciation, unlockSpeechSynthesis };
