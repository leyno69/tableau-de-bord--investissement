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
    <p class="subtitle">LEYNOR ne recommande aucun achat. Il hiérarchise uniquement les sujets qui méritent une analyse plus approfondie.</p>
    <div class="opportunity-grid">
      ${demoOpportunityCards.slice(0, 3).map(card => `
        <article class="opportunity-card">
          <div class="opportunity-top">
            <div><span class="badge">${escapeHtml(card.category)}</span><h3>${escapeHtml(card.asset)}</h3></div>
            <div class="opportunity-confidence"><strong>${Math.round(card.confidence * 100)} %</strong><small>confiance</small></div>
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
    .opportunity-radar{margin-top:22px}.opportunity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.opportunity-card{min-width:0;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035)}.opportunity-top{display:flex;justify-content:space-between;gap:14px;align-items:start}.opportunity-top h3{margin:8px 0 0}.opportunity-confidence{text-align:right;white-space:nowrap}.opportunity-confidence strong,.opportunity-confidence small{display:block}.opportunity-confidence strong{font-size:1.45rem;color:#f1cc7a}.opportunity-confidence small,.opportunity-meta,details small{color:#9fb0ca}.opportunity-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.opportunity-meta span{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.06)}.opportunity-detail{margin-top:12px}.opportunity-detail strong{font-size:.84rem}.opportunity-detail ul{margin:6px 0 0;padding-left:18px;color:#cbd7e8}.opportunity-detail li{margin:4px 0}.opportunity-card details{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}.opportunity-card summary{cursor:pointer;color:#f1cc7a}@media(max-width:760px){.opportunity-grid{grid-template-columns:1fr}.opportunity-card{overflow:hidden}.opportunity-top{align-items:center}}
  `;
  document.head.append(style);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createOpportunitySection);
else createOpportunitySection();

export { createOpportunitySection };
