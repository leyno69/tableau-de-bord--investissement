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
  const style = document.createElement('style');
  style.textContent = `
    .assistant-backdrop{position:fixed;inset:0;background:rgba(4,10,24,.55);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:.25s;z-index:80}
    .assistant-backdrop.open{opacity:1;pointer-events:auto}.assistant-drawer{position:fixed;top:0;right:0;width:min(460px,100%);height:100dvh;background:#0d1728;color:#eef4ff;transform:translateX(100%);transition:.3s;z-index:90;display:grid;grid-template-rows:auto 1fr auto;box-shadow:-24px 0 60px rgba(0,0,0,.35)}
    .assistant-drawer.open{transform:translateX(0)}.assistant-head{padding:22px;border-bottom:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;gap:16px;align-items:center}.assistant-head strong{display:block;font-size:1.15rem}.assistant-head small{color:#9fb0ca}
    .assistant-close{border:0;background:rgba(255,255,255,.08);color:white;width:38px;height:38px;border-radius:12px;font-size:1.2rem;cursor:pointer}.assistant-thread{padding:22px;overflow:auto;display:flex;flex-direction:column;gap:14px}.assistant-message{max-width:90%;padding:13px 15px;border-radius:16px;line-height:1.5;font-size:.94rem}.assistant-message.user{align-self:flex-end;background:#4f7cff}.assistant-message.assistant{align-self:flex-start;background:rgba(255,255,255,.08);color:#dfe8f7}.assistant-message.warning{border:1px solid rgba(255,190,92,.35)}.assistant-message.positive{border:1px solid rgba(83,211,150,.3)}
    .assistant-meta{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:.76rem;color:#9fb0ca}.assistant-confidence{padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.08)}.assistant-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.assistant-actions button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#dce7f7;border-radius:10px;padding:7px 9px;cursor:pointer;font-size:.78rem}
    .assistant-suggestions{display:flex;gap:8px;overflow:auto;padding:0 22px 14px}.assistant-suggestions button{white-space:nowrap;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c8d5e8;border-radius:999px;padding:9px 12px;cursor:pointer}.assistant-form{padding:16px 22px 22px;border-top:1px solid rgba(255,255,255,.09);display:flex;gap:10px}.assistant-form input{flex:1;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:14px;padding:13px 14px}.assistant-form button{border:0;background:#4f7cff;color:white;border-radius:14px;padding:0 18px;font-weight:700;cursor:pointer}
  `;
  document.head.append(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'assistant-backdrop';
  const drawer = document.createElement('aside');
  drawer.className = 'assistant-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `<header class="assistant-head"><div><strong>✦ Assistant LEYNOR</strong><small>Mémoire et portefeuille actifs</small></div><button class="assistant-close" aria-label="Fermer">×</button></header><div><div class="assistant-thread" aria-live="polite"></div><div class="assistant-suggestions">${suggestedPrompts.map(prompt => `<button type="button">${prompt}</button>`).join('')}</div></div><form class="assistant-form"><input aria-label="Votre question" placeholder="Posez une question à LEYNOR…" required /><button>Envoyer</button></form>`;
  document.body.append(backdrop, drawer);

  const thread = drawer.querySelector('.assistant-thread');
  const form = drawer.querySelector('form');
  const input = drawer.querySelector('input');
  let history = await loadAssistantHistory();

  function render() {
    thread.innerHTML = history.length ? history.map(item => {
      const insight = item.insight;
      const metadata = insight ? `<div class="assistant-meta"><span class="assistant-confidence">Confiance ${Math.round(insight.confidence * 100)} %</span></div><div class="assistant-actions">${insight.actions.map(action => `<button type="button" data-action="${escapeHtml(action)}">${escapeHtml(action)}</button>`).join('')}</div>` : '';
      return `<div class="assistant-message ${item.role} ${insight?.severity ?? ''}">${escapeHtml(item.content)}${metadata}</div>`;
    }).join('') : '<div class="assistant-message assistant">Bonjour Oscar. Je peux maintenant analyser les positions et les liquidités enregistrées dans votre portefeuille.</div>';
    thread.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => ask(button.dataset.action)));
    thread.scrollTop = thread.scrollHeight;
  }
  function open() { drawer.classList.add('open'); backdrop.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); input.focus(); }
  function close() { drawer.classList.remove('open'); backdrop.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  async function ask(question) {
    const content = question.trim();
    if (!content) return;
    const portfolio = loadPortfolioFromStorage(window.localStorage);
    const result = buildPortfolioInsight(content, portfolio);
    history.push({ role: 'user', content }, { role: 'assistant', content: result.text, insight: result });
    render();
    await rememberAssistantExchange(content, result.text);
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
