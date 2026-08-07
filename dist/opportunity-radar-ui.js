import { demoOpportunityCards } from './opportunity-radar.js';

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

function renderList(title, values) {
  const items = values.length ? values.map(value => `<li>${escapeHtml(value)}</li>`).join('') : '<li>Aucun élément renseigné</li>';
  return `<div class="opportunity-detail"><strong>${escapeHtml(title)}</strong><ul>${items}</ul></div>`;
}

function renderAssessment(assessment) {
  if (assessment.status !== 'validated') {
    return `<div class="opportunity-confidence is-unavailable"><strong>${escapeHtml(assessment.label)}</strong><small>${escapeHtml(assessment.reason)}</small></div>`;
  }

  return `<div class="opportunity-confidence is-validated"><strong>${Math.round(assessment.probability * 100)} %</strong><small>${escapeHtml(assessment.label)}</small><span>Calibration ${escapeHtml(assessment.calibrationId)}</span></div>`;
}

function createOpportunitySection() {
  if (document.querySelector('[data-opportunity-radar]')) return;
  const radar = document.querySelector('#radar');
  if (!radar) return;

  const section = document.createElement('article');
  section.className = 'panel opportunity-radar';
  section.setAttribute('data-opportunity-radar', 'true');
  section.innerHTML = `
    <div class="panel-head">
      <div><p class="eyebrow">RADAR EXPLICABLE</p><h2>Opportunités à étudier</h2></div>
      <a class="btn secondary" href="trends.html">Voir les preuves</a>
    </div>
    <p class="subtitle">LEYNOR ne recommande aucun achat. Il hiérarchise uniquement les sujets qui méritent une analyse plus approfondie. Aucun pourcentage n’est affiché sans calibration empirique validée.</p>
    <div class="opportunity-grid">
      ${demoOpportunityCards.slice(0, 3).map(card => `
        <article class="opportunity-card">
          <div class="opportunity-top">
            <div><span class="badge">${escapeHtml(card.category)}</span><h3>${escapeHtml(card.asset)}</h3></div>
            ${renderAssessment(card.assessment)}
          </div>
          <p>${escapeHtml(card.thesis)}</p>
          <div class="opportunity-meta"><span>${escapeHtml(card.horizon)}</span><span>${escapeHtml(card.status)}</span></div>
          ${renderList('Éléments favorables', card.favorableEvidence)}
          ${renderList('Contre-arguments', card.counterEvidence)}
          ${renderList('Risques', card.risks)}
          <details><summary>Sources et limites</summary>${renderList('Sources déclarées', card.sources)}${renderList('Limites', card.limitations)}<small>Fraîcheur : ${escapeHtml(card.freshness)}</small></details>
        </article>
      `).join('')}
    </div>`;

  radar.insertAdjacentElement('afterend', section);

  const style = document.createElement('style');
  style.textContent = `
    .opportunity-radar{margin-top:22px}.opportunity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.opportunity-card{min-width:0;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035)}.opportunity-top{display:flex;justify-content:space-between;gap:14px;align-items:start}.opportunity-top h3{margin:8px 0 0}.opportunity-confidence{max-width:210px;text-align:right}.opportunity-confidence strong,.opportunity-confidence small,.opportunity-confidence span{display:block}.opportunity-confidence strong{font-size:1.1rem;color:#f1cc7a}.opportunity-confidence small,.opportunity-confidence span,.opportunity-meta,details small{color:#9fb0ca}.opportunity-confidence span{font-size:.72rem;margin-top:4px}.opportunity-confidence.is-unavailable strong{color:#d9e1ee}.opportunity-confidence.is-unavailable small{font-size:.72rem;line-height:1.35;margin-top:4px}.opportunity-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.opportunity-meta span{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.06)}.opportunity-detail{margin-top:12px}.opportunity-detail strong{font-size:.84rem}.opportunity-detail ul{margin:6px 0 0;padding-left:18px;color:#cbd7e8}.opportunity-detail li{margin:4px 0}.opportunity-card details{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}.opportunity-card summary{cursor:pointer;color:#f1cc7a}@media(max-width:760px){.opportunity-grid{grid-template-columns:1fr}.opportunity-card{overflow:hidden}.opportunity-top{align-items:flex-start;flex-direction:column}.opportunity-confidence{max-width:none;text-align:left}}
  `;
  document.head.append(style);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createOpportunitySection);
else createOpportunitySection();

export { createOpportunitySection, renderAssessment };
