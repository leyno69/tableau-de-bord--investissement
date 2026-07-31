import { buy, createSimulation, sell, simulateDca, summarizeSimulation } from './portfolio-simulator.js';
import { createSimulationFromPreset, simulationPresets } from './simulation-presets.js';

const STORAGE_KEY = 'leynor-paper-simulation';
const ACTIVE_PRESET_KEY = 'leynor-paper-active-preset';
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

function loadSimulation() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.isSimulation && Array.isArray(stored.positions) && Array.isArray(stored.transactions)) return stored;
  } catch {}
  return createSimulation({ initialCash: 10000 });
}

let simulation = loadSimulation();
let activePresetId = localStorage.getItem(ACTIVE_PRESET_KEY) || '';

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation));
}

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

function render() {
  const summary = summarizeSimulation(simulation);
  document.querySelector('#simTotal').textContent = money.format(summary.totalValue);
  document.querySelector('#simCash').textContent = money.format(summary.cash);
  document.querySelector('#simPnl').textContent = money.format(summary.pnl);
  document.querySelector('#simPnl').className = summary.pnl >= 0 ? 'positive' : 'negative';
  document.querySelector('#simTransactions').textContent = String(summary.transactionCount);
  document.querySelector('#simPositions').innerHTML = simulation.positions.length
    ? simulation.positions.map(position => `<tr><td><strong>${escapeHtml(position.name)}</strong><small>${escapeHtml(position.ticker)} • fictif</small></td><td>${position.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 6 })}</td><td>${money.format(position.avgPrice)}</td><td>${money.format(position.price)}</td><td>${money.format(position.quantity * position.price)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">Aucune position fictive.</td></tr>';
  renderPresetSelection();
}

function value(selector) {
  return document.querySelector(selector).value;
}

function setDcaFields(dca) {
  if (!dca) return;
  document.querySelector('#dcaInitial').value = dca.initialAmount;
  document.querySelector('#dcaMonthly').value = dca.monthlyAmount;
  document.querySelector('#dcaMonths').value = dca.months;
  document.querySelector('#dcaReturn').value = dca.annualReturn * 100;
  document.querySelector('#runDca').click();
}

function showPresetFeedback(message, kind = 'success') {
  const feedback = document.querySelector('#presetFeedback');
  if (!feedback) return;
  feedback.hidden = false;
  feedback.dataset.kind = kind;
  feedback.textContent = message;
}

function renderPresetSelection() {
  document.querySelectorAll('[data-preset]').forEach(button => {
    const selected = button.dataset.preset === activePresetId;
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? '✓ Scénario chargé' : 'Charger ce scénario';
    button.closest('.watch-card')?.classList.toggle('is-selected', selected);
  });
}

async function loadPreset(presetId, button) {
  const originalLabel = button?.textContent || 'Charger ce scénario';
  if (button) {
    button.disabled = true;
    button.textContent = 'Chargement…';
  }

  try {
    const result = createSimulationFromPreset(presetId);
    simulation = result.simulation;
    activePresetId = result.preset.id;
    localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
    persist();
    setDcaFields(result.preset.dca);
    render();

    const message = `Scénario « ${result.preset.label} » chargé avec succès. Toutes les sommes sont fictives.`;
    document.querySelector('#simStatus').textContent = message;
    showPresetFeedback(message);

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.querySelector('.metric-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de charger ce scénario.';
    document.querySelector('#simStatus').textContent = message;
    showPresetFeedback(message, 'error');
    if (button) button.textContent = originalLabel;
  } finally {
    if (button) button.disabled = false;
  }
}

function mountDemoPresets() {
  const operationPanel = document.querySelector('#executeSimulation')?.closest('.panel');
  const formGrid = operationPanel?.querySelector('.form-grid');
  if (!operationPanel || !formGrid || document.querySelector('#simulationPresets')) return;

  const section = document.createElement('section');
  section.id = 'simulationPresets';
  section.style.marginBottom = '20px';
  section.innerHTML = `
    <div class="panel-head">
      <div><p class="eyebrow">DÉMONSTRATION BÊTA</p><h2>Scénarios prêts à tester</h2></div>
      <span class="badge">100 % FICTIF</span>
    </div>
    <p id="presetFeedback" class="simulation-preset-feedback" role="status" aria-live="polite" hidden></p>
    <div class="watch-grid">
      ${simulationPresets.map(preset => `<article class="watch-card"><div class="watch-card-top"><div><h3>${escapeHtml(preset.label)}</h3><span class="ticker">${money.format(preset.initialCash)} fictifs</span></div></div><p class="watch-note">${escapeHtml(preset.description)}</p><button class="btn secondary" type="button" data-preset="${preset.id}" aria-pressed="false">Charger ce scénario</button></article>`).join('')}
    </div>`;
  operationPanel.insertBefore(section, formGrid);

  section.addEventListener('click', event => {
    const button = event.target.closest('button[data-preset]');
    if (!button || button.disabled) return;
    loadPreset(button.dataset.preset, button);
  });

  const style = document.createElement('style');
  style.textContent = `
    .simulation-preset-feedback{margin:12px 0 16px;padding:12px 14px;border-radius:12px;background:rgba(83,211,150,.12);border:1px solid rgba(83,211,150,.28);color:#bff3d8}
    .simulation-preset-feedback[data-kind="error"]{background:rgba(255,138,138,.1);border-color:rgba(255,138,138,.3);color:#ffd0d0}
    #simulationPresets .watch-card{transition:border-color .2s,transform .2s,background .2s}
    #simulationPresets .watch-card.is-selected{border-color:rgba(241,204,122,.62);background:rgba(241,204,122,.07);transform:translateY(-1px)}
    #simulationPresets button[aria-pressed="true"]{background:#f1cc7a;color:#071426;border-color:#f1cc7a}
    #simulationPresets button:disabled{opacity:.72;cursor:wait}
  `;
  document.head.append(style);
  renderPresetSelection();
}

document.querySelector('#executeSimulation').addEventListener('click', () => {
  const status = document.querySelector('#simStatus');
  try {
    const operation = value('#simOperation');
    const ticker = value('#simTicker');
    const price = Number(value('#simPrice'));
    if (operation === 'buy') buy(simulation, { ticker, name: value('#simName'), amount: Number(value('#simAmount')), price });
    else sell(simulation, { ticker, quantity: Number(value('#simQuantity')), price });
    activePresetId = '';
    localStorage.removeItem(ACTIVE_PRESET_KEY);
    persist();
    render();
    status.textContent = `Opération ${operation === 'buy' ? 'd’achat' : 'de vente'} fictive enregistrée. Aucune donnée réelle n’a été modifiée.`;
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector('#resetSimulation').addEventListener('click', () => {
  simulation = createSimulation({ initialCash: 10000 });
  activePresetId = '';
  localStorage.removeItem(ACTIVE_PRESET_KEY);
  persist();
  render();
  showPresetFeedback('Le scénario fictif a été réinitialisé.');
  document.querySelector('#simStatus').textContent = 'Le scénario fictif a été réinitialisé.';
});

document.querySelector('#runDca').addEventListener('click', () => {
  const target = document.querySelector('#dcaResult');
  try {
    const result = simulateDca({
      initialAmount: Number(value('#dcaInitial')),
      monthlyAmount: Number(value('#dcaMonthly')),
      months: Number(value('#dcaMonths')),
      annualReturn: Number(value('#dcaReturn')) / 100
    });
    target.innerHTML = `<div class="alert"><strong>Valeur finale simulée : ${money.format(result.finalValue)}</strong><small>Versements : ${money.format(result.contributed)} • Gain théorique : ${money.format(result.gain)}</small></div>`;
  } catch (error) {
    target.innerHTML = `<div class="alert"><strong>Simulation impossible</strong><small>${escapeHtml(error.message)}</small></div>`;
  }
});

mountDemoPresets();
render();
document.querySelector('#runDca').click();

export { loadPreset, mountDemoPresets };
