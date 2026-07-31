import { createBetaFeedback, exportFeedbackJson, summarizeBetaFeedback } from './beta-feedback.js';

const STORAGE_KEY = 'leynor-beta-feedback';
const read = selector => document.querySelector(selector);

function load() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

let feedback = load();

function render() {
  const summary = summarizeBetaFeedback(feedback);
  read('#feedbackCount').textContent = String(summary.count);
  read('#feedbackEase').textContent = summary.count ? summary.ease.toFixed(1) : '—';
  read('#feedbackUsefulness').textContent = summary.count ? summary.usefulness.toFixed(1) : '—';
  read('#feedbackConfidence').textContent = summary.count ? summary.confidence.toFixed(1) : '—';
  read('#feedbackList').innerHTML = feedback.length ? [...feedback].reverse().slice(0, 8).map(item => `<div class="alert"><strong>${item.area} · ${item.category}</strong><small>${item.tester} · facilité ${item.ease}/5 · utilité ${item.usefulness}/5 · confiance ${item.confidence}/5</small><small>${item.message}</small></div>`).join('') : '<p class="empty">Aucun retour enregistré.</p>';
}

read('#saveFeedback').addEventListener('click', () => {
  try {
    const item = createBetaFeedback({
      tester: read('#feedbackTester').value,
      area: read('#feedbackArea').value,
      ease: read('#feedbackEaseInput').value,
      usefulness: read('#feedbackUsefulnessInput').value,
      confidence: read('#feedbackConfidenceInput').value,
      category: read('#feedbackCategory').value,
      message: read('#feedbackMessage').value,
      scenario: read('#feedbackScenario').value
    });
    feedback.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
    read('#feedbackMessage').value = '';
    read('#feedbackStatus').textContent = 'Retour bêta enregistré localement.';
    render();
  } catch (error) { read('#feedbackStatus').textContent = error.message; }
});

read('#exportFeedback').addEventListener('click', () => {
  const blob = new Blob([exportFeedbackJson(feedback)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leynor-retours-beta.json';
  link.click();
  URL.revokeObjectURL(url);
  read('#feedbackStatus').textContent = 'Export JSON généré.';
});

render();
