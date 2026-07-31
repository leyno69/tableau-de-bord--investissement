import { loadAssistantHistory, rememberAssistantExchange } from './assistant-memory.js';

const suggestedPrompts = [
  'Analyse la concentration de mon portefeuille',
  'Que puis-je renforcer avec mes liquidités ?',
  'Résume mes alertes prioritaires'
];

function buildReply(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes('concentration')) return 'Votre exposition principale semble concentrée sur les grandes capitalisations américaines. LEYNOR recommande de surveiller la part géographique avant tout nouveau renforcement.';
  if (normalized.includes('liquidit') || normalized.includes('renforcer')) return 'Conservez une réserve de sécurité et utilisez le solde destiné à l’investissement par étapes. Priorité aux actifs déjà cohérents avec votre stratégie long terme.';
  if (normalized.includes('alerte')) return 'Les alertes actuelles doivent être classées par impact : risque de concentration, variation inhabituelle et opportunité proche de votre zone d’achat.';
  return 'Votre demande est désormais conservée par la mémoire LEYNOR. La prochaine étape connectera cette conversation au moteur d’analyse de portefeuille.';
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

async function mountAssistant() {
  const style = document.createElement('style');
  style.textContent = `
    .assistant-backdrop{position:fixed;inset:0;background:rgba(4,10,24,.55);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:.25s;z-index:80}
    .assistant-backdrop.open{opacity:1;pointer-events:auto}.assistant-drawer{position:fixed;top:0;right:0;width:min(440px,100%);height:100dvh;background:#0d1728;color:#eef4ff;transform:translateX(100%);transition:.3s;z-index:90;display:grid;grid-template-rows:auto 1fr auto;box-shadow:-24px 0 60px rgba(0,0,0,.35)}
    .assistant-drawer.open{transform:translateX(0)}.assistant-head{padding:22px;border-bottom:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;gap:16px;align-items:center}.assistant-head strong{display:block;font-size:1.15rem}.assistant-head small{color:#9fb0ca}
    .assistant-close{border:0;background:rgba(255,255,255,.08);color:white;width:38px;height:38px;border-radius:12px;font-size:1.2rem;cursor:pointer}.assistant-thread{padding:22px;overflow:auto;display:flex;flex-direction:column;gap:14px}.assistant-message{max-width:88%;padding:13px 15px;border-radius:16px;line-height:1.5;font-size:.94rem}.assistant-message.user{align-self:flex-end;background:#4f7cff}.assistant-message.assistant{align-self:flex-start;background:rgba(255,255,255,.08);color:#dfe8f7}
    .assistant-suggestions{display:flex;gap:8px;overflow:auto;padding:0 22px 14px}.assistant-suggestions button{white-space:nowrap;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c8d5e8;border-radius:999px;padding:9px 12px;cursor:pointer}.assistant-form{padding:16px 22px 22px;border-top:1px solid rgba(255,255,255,.09);display:flex;gap:10px}.assistant-form input{flex:1;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:13px 14px}.assistant-form button{border:0;background:#4f7cff;color:white;border-radius:14px;padding:0 18px;font-weight:700;cursor:pointer}
  `;
  document.head.append(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'assistant-backdrop';
  const drawer = document.createElement('aside');
  drawer.className = 'assistant-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `<header class="assistant-head"><div><strong>✦ Assistant LEYNOR</strong><small>Mémoire métier active</small></div><button class="assistant-close" aria-label="Fermer">×</button></header><div><div class="assistant-thread" aria-live="polite"></div><div class="assistant-suggestions">${suggestedPrompts.map(prompt => `<button type="button">${prompt}</button>`).join('')}</div></div><form class="assistant-form"><input aria-label="Votre question" placeholder="Posez une question à LEYNOR…" required /><button>Envoyer</button></form>`;
  document.body.append(backdrop, drawer);

  const thread = drawer.querySelector('.assistant-thread');
  const form = drawer.querySelector('form');
  const input = drawer.querySelector('input');
  let history = await loadAssistantHistory();

  function render() {
    thread.innerHTML = history.length ? history.map(item => `<div class="assistant-message ${item.role}">${escapeHtml(item.content)}</div>`).join('') : '<div class="assistant-message assistant">Bonjour Oscar. Je peux analyser votre portefeuille, vos liquidités et vos alertes.</div>';
    thread.scrollTop = thread.scrollHeight;
  }
  function open() { drawer.classList.add('open'); backdrop.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); input.focus(); }
  function close() { drawer.classList.remove('open'); backdrop.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  async function ask(question) {
    const content = question.trim();
    if (!content) return;
    const answer = buildReply(content);
    history.push({ role: 'user', content }, { role: 'assistant', content: answer });
    render();
    await rememberAssistantExchange(content, answer);
  }

  document.querySelectorAll('.assistant-trigger, a[href="#assistant"], .ai-brief .text-button').forEach(element => element.addEventListener('click', event => { event.preventDefault(); open(); }));
  drawer.querySelector('.assistant-close').addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  drawer.querySelectorAll('.assistant-suggestions button').forEach(button => button.addEventListener('click', () => ask(button.textContent)));
  form.addEventListener('submit', async event => { event.preventDefault(); const question = input.value; input.value = ''; await ask(question); });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAssistant);
else mountAssistant();
