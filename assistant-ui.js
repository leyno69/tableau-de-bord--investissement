import { loadAssistantHistory, rememberAssistantExchange } from './assistant-memory.js';
import { buildPortfolioInsight, loadPortfolioFromStorage } from './portfolio-assistant.js';

const suggestedPrompts = [
  'Analyse la concentration de mon portefeuille',
  'Que puis-je renforcer avec mes liquidités ?',
  'Résume mes alertes prioritaires'
];

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

async function mountAssistant() {
  document.body.classList.remove('assistant-open');

  const style = document.createElement('style');
  style.textContent = `
    .assistant-backdrop{position:fixed;inset:0;background:rgba(4,10,24,.55);backdrop-filter:blur(4px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility 0s linear .25s;z-index:80}
    .assistant-backdrop.open{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}
    .assistant-drawer{position:fixed;inset:0 0 0 auto;width:min(460px,100vw);max-width:100vw;height:100dvh;box-sizing:border-box;overflow:hidden;background:#0d1728;color:#eef4ff;transform:translateX(100%);visibility:hidden;pointer-events:none;transition:transform .3s,visibility 0s linear .3s;z-index:90;display:grid;grid-template-rows:auto minmax(0,1fr) auto;box-shadow:-24px 0 60px rgba(0,0,0,.35);overscroll-behavior:contain}
    .assistant-drawer.open{transform:translateX(0);visibility:visible;pointer-events:auto;transition-delay:0s}
    .assistant-head{min-width:0;padding:max(18px,env(safe-area-inset-top)) 18px 18px;box-sizing:border-box;border-bottom:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;gap:12px;align-items:center}
    .assistant-head>div{min-width:0}.assistant-head strong{display:block;font-size:1.15rem;overflow-wrap:anywhere}.assistant-head small{display:block;color:#9fb0ca;overflow-wrap:anywhere}
    .assistant-close{flex:0 0 42px;border:0;background:rgba(255,255,255,.1);color:white;width:42px;height:42px;border-radius:12px;font-size:1.45rem;cursor:pointer}
    .assistant-content{min-width:0;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;overflow:hidden}
    .assistant-thread{min-width:0;min-height:0;padding:18px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch}
    .assistant-message{box-sizing:border-box;min-width:0;max-width:100%;padding:13px 15px;border-radius:16px;line-height:1.5;font-size:.94rem;overflow-wrap:anywhere;word-break:break-word;white-space:normal}
    .assistant-message.user{align-self:flex-end;background:#4f7cff}.assistant-message.assistant{align-self:flex-start;background:rgba(255,255,255,.08);color:#dfe8f7}.assistant-message.warning{border:1px solid rgba(255,190,92,.35)}.assistant-message.positive{border:1px solid rgba(83,211,150,.3)}
    .assistant-meta{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:.76rem;color:#9fb0ca}.assistant-confidence{padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.08)}
    .assistant-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;margin-top:10px}.assistant-actions button{max-width:100%;white-space:normal;overflow-wrap:anywhere;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#dce7f7;border-radius:10px;padding:9px 10px;cursor:pointer;font-size:.78rem}
    .assistant-suggestions{min-width:0;display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:0 18px 14px;scrollbar-width:none}.assistant-suggestions::-webkit-scrollbar{display:none}.assistant-suggestions button{flex:0 0 auto;max-width:82vw;white-space:normal;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c8d5e8;border-radius:999px;padding:9px 12px;cursor:pointer}
    .assistant-form{box-sizing:border-box;min-width:0;padding:14px 18px max(18px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.09);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;background:#0d1728}.assistant-form input{box-sizing:border-box;min-width:0;width:100%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:13px 14px}.assistant-form button{border:0;background:#4f7cff;color:white;border-radius:14px;padding:0 16px;font-weight:700;cursor:pointer}
    body.assistant-open{overflow:hidden;touch-action:none}
    @media(max-width:520px){.assistant-drawer{width:100vw}.assistant-head{padding-left:16px;padding-right:16px}.assistant-thread{padding:16px}.assistant-form{padding-left:16px;padding-right:16px}.assistant-form button{padding:0 13px}.assistant-message{font-size:.93rem}}
  `;
  document.head.append(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'assistant-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  const drawer = document.createElement('aside');
  drawer.className = 'assistant-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  drawer.innerHTML = `<header class="assistant-head"><div><strong>✦ Assistant LEYNOR</strong><small>Mémoire et portefeuille actifs</small></div><button class="assistant-close" type="button" aria-label="Fermer l’assistant">×</button></header><div class="assistant-content"><div class="assistant-thread" aria-live="polite"></div><div class="assistant-suggestions">${suggestedPrompts.map(prompt => `<button type="button">${prompt}</button>`).join('')}</div></div><form class="assistant-form"><input aria-label="Votre question" placeholder="Posez une question à LEYNOR…" required /><button>Envoyer</button></form>`;
  document.body.append(backdrop, drawer);

  const thread = drawer.querySelector('.assistant-thread');
  const form = drawer.querySelector('form');
  const input = drawer.querySelector('input');
  let conversationHistory = await loadAssistantHistory();

  function render() {
    thread.innerHTML = conversationHistory.length ? conversationHistory.map(item => {
      const insight = item.insight;
      const metadata = insight ? `<div class="assistant-meta"><span class="assistant-confidence">Confiance ${Math.round(insight.confidence * 100)} %</span></div><div class="assistant-actions">${insight.actions.map(action => `<button type="button" data-action="${escapeHtml(action)}">${escapeHtml(action)}</button>`).join('')}</div>` : '';
      return `<div class="assistant-message ${item.role} ${insight?.severity ?? ''}">${escapeHtml(item.content)}${metadata}</div>`;
    }).join('') : '<div class="assistant-message assistant">Bonjour Oscar. Je peux maintenant analyser les positions et les liquidités enregistrées dans votre portefeuille.</div>';
    thread.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => ask(button.dataset.action)));
    thread.scrollTop = thread.scrollHeight;
  }

  function open() {
    drawer.removeAttribute('inert');
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('assistant-open');
    window.history.pushState({ leynorAssistant: true }, '');
    window.setTimeout(() => input.focus({ preventScroll: true }), 180);
  }

  function close({ fromHistory = false } = {}) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    document.body.classList.remove('assistant-open');
    if (!fromHistory && window.history.state?.leynorAssistant) window.history.back();
  }

  async function ask(question) {
    const content = question.trim();
    if (!content) return;
    const portfolio = loadPortfolioFromStorage(window.localStorage);
    const result = buildPortfolioInsight(content, portfolio);
    conversationHistory.push({ role: 'user', content }, { role: 'assistant', content: result.text, insight: result });
    render();
    await rememberAssistantExchange(content, result.text);
  }

  document.querySelectorAll('.assistant-trigger, a[href="#assistant"], .ai-brief .text-button').forEach(element => element.addEventListener('click', event => { event.preventDefault(); open(); }));
  drawer.querySelector('.assistant-close').addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  window.addEventListener('popstate', () => { if (drawer.classList.contains('open')) close({ fromHistory: true }); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  drawer.querySelectorAll('.assistant-suggestions button').forEach(button => button.addEventListener('click', () => ask(button.textContent)));
  form.addEventListener('submit', async event => { event.preventDefault(); const question = input.value; input.value = ''; await ask(question); });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAssistant);
else mountAssistant();
