const VOICE_KEY = 'leynor-voice-settings';
const PROFILE_MODE_KEY = 'leynor-beta-profile-mode';
const BACKUP_PREFIX = 'leynor-private-backup:';
const PRIVATE_KEYS = ['invest-dashboard-portfolio', 'invest-dashboard-watchlist', 'invest-dashboard-active-broker'];
const FEMALE = /audrey|aurélie|aurelie|amelie|amélie|marie|hortense|virginie|julie|celine|céline|lea|léa|alice|sophie|claire|denise|eloise|éloïse|charlotte|isabelle|valerie|valérie/i;
const MALE = /thomas|henri|paul|nicolas|antoine|luc|mathieu|pierre|alain|claude|daniel|gerard|gérard|jacques|jean|louis|remy|rémy|yves|florian|bernard/i;

function readPreference() {
  try {
    const value = JSON.parse(localStorage.getItem(VOICE_KEY) || '{}').preference;
    return ['female', 'male', 'auto'].includes(value) ? value : 'female';
  } catch { return 'female'; }
}

function voiceGender(voice) {
  const name = `${voice?.name || ''} ${voice?.voiceURI || ''}`;
  if (MALE.test(name)) return 'male';
  if (FEMALE.test(name)) return 'female';
  return 'unknown';
}

function selectVoice(preference = readPreference()) {
  const voices = globalThis.speechSynthesis?.getVoices?.() || [];
  const french = voices.filter(voice => /^fr[-_]/i.test(voice.lang || ''));
  if (!french.length) return null;
  if (preference !== 'auto') {
    const exact = french.find(voice => voiceGender(voice) === preference);
    if (exact) return exact;
  }
  return french.find(voice => /natural|premium|enhanced|neural/i.test(voice.name || '')) || french[0];
}

function patchSpeechVoice() {
  const synthesis = globalThis.speechSynthesis;
  if (!synthesis?.speak || synthesis.speak.__leynorVoicePreferencePatched) return;
  const original = synthesis.speak.bind(synthesis);
  const patched = utterance => {
    const selected = selectVoice();
    if (utterance && selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang || 'fr-FR';
    }
    return original(utterance);
  };
  patched.__leynorVoicePreferencePatched = true;
  synthesis.speak = patched;
}

function hasPrivateBackup() {
  return PRIVATE_KEYS.some(key => sessionStorage.getItem(`${BACKUP_PREFIX}${key}`) != null);
}

function restorePrivateProfile() {
  if (!hasPrivateBackup()) {
    window.alert('Aucun profil privé sauvegardé sur cet appareil. Une authentification distante sera ajoutée dans une version ultérieure.');
    return;
  }
  for (const key of PRIVATE_KEYS) {
    const backupKey = `${BACKUP_PREFIX}${key}`;
    const value = sessionStorage.getItem(backupKey);
    if (value != null) localStorage.setItem(key, value);
    sessionStorage.removeItem(backupKey);
  }
  localStorage.removeItem(PROFILE_MODE_KEY);
  window.location.reload();
}

function ensureMobileAccountButton() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || actions.querySelector('[data-mobile-account]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn secondary mobile-account-button';
  button.dataset.mobileAccount = 'true';
  const guest = localStorage.getItem(PROFILE_MODE_KEY) === 'guest';
  button.textContent = guest ? 'Connexion à mon compte' : 'Mon compte';
  button.setAttribute('aria-label', guest ? 'Revenir au profil privé sauvegardé sur cet appareil' : 'Ouvrir le menu du profil');
  button.addEventListener('click', () => {
    if (localStorage.getItem(PROFILE_MODE_KEY) === 'guest') restorePrivateProfile();
    else document.querySelector('#profileMenuButton')?.click();
  });
  actions.prepend(button);

  if (!document.querySelector('style[data-mobile-account-style]')) {
    const style = document.createElement('style');
    style.dataset.mobileAccountStyle = 'true';
    style.textContent = '@media (min-width:681px){.mobile-account-button{display:none}}@media (max-width:680px){.mobile-account-button{display:inline-flex!important;min-height:44px;width:100%;justify-content:center;order:-10}.topbar-actions{align-items:stretch}}';
    document.head.append(style);
  }
}

function inferAsset(card) {
  const ticker = card.dataset.marketSymbol || card.dataset.ticker || card.querySelector('.ticker, small')?.textContent?.split('•')[0]?.trim();
  const name = card.dataset.assetName || card.querySelector('h2, h3, strong, .asset-cell span')?.textContent?.trim() || ticker;
  const priceText = card.dataset.price || card.querySelector('[data-price], .price, .watch-price')?.textContent || '';
  const price = Number(String(priceText).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return ticker ? { name: name || ticker, ticker, marketSymbol: ticker, price: Number.isFinite(price) ? price : 0, change: null } : null;
}

function installAssetClickFallback() {
  document.addEventListener('click', async event => {
    const card = event.target.closest('[data-market-symbol], [data-ticker], .opportunity-card, .trend-card, .radar-card');
    if (!card || card.closest('#assetDetailsDialog') || card.matches('.watch-card') || card.closest('#portfolioTable')) return;
    const item = inferAsset(card);
    if (!item) return;
    const module = await import('./asset-details.js');
    if (typeof module.openDetails === 'function') module.openDetails(item);
  });
}

function initialize() {
  patchSpeechVoice();
  ensureMobileAccountButton();
  installAssetClickFallback();
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', patchSpeechVoice);
  document.addEventListener('change', event => {
    if (event.target?.id !== 'leynorVoicePreference') return;
    globalThis.speechSynthesis?.cancel?.();
    patchSpeechVoice();
  });
}

initialize();

export { readPreference, voiceGender, selectVoice, patchSpeechVoice, hasPrivateBackup, restorePrivateProfile, ensureMobileAccountButton, inferAsset };
