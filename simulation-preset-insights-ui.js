import { simulationPresets } from './simulation-presets.js';

const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

export function renderPresetInsights(root = document) {
  for (const preset of simulationPresets) {
    const button = root.querySelector(`[data-preset="${preset.id}"]`);
    const card = button?.closest('.watch-card');
    if (!card || card.querySelector('.simulation-preset-insights')) continue;

    const details = document.createElement('div');
    details.className = 'simulation-preset-insights';
    details.innerHTML = `
      <div class="simulation-preset-tags">
        <span>${escapeHtml(preset.riskLabel)}</span>
        <span>Horizon ${preset.horizonYears} ans</span>
      </div>
      <dl>
        ${preset.allocation.map(item => `<div><dt>${escapeHtml(item.label)}</dt><dd>${percent.format(item.weight)}</dd></div>`).join('')}
      </dl>
      <p><strong>Hypothèses :</strong> rendement annuel ${percent.format(preset.assumptions.annualReturn)}, volatilité ${percent.format(preset.assumptions.annualVolatility)}.</p>
      <small>${escapeHtml(preset.assumptions.disclaimer)}</small>`;
    button.before(details);
  }
}

function mount() {
  renderPresetInsights();
  const section = document.querySelector('#simulationPresets');
  if (!section) requestAnimationFrame(mount);
}

mount();
