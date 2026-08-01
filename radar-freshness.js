const REFRESH_LABEL = 'Prochaine mise à jour : au prochain appui sur Actualiser';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimestamp(value) {
  const date = parseDate(value);
  if (!date) return 'Donnée locale — heure de calcul indisponible';
  return `Calculé le ${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)}`;
}

function readWatchlist() {
  try {
    const value = JSON.parse(localStorage.getItem('invest-dashboard-watchlist') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function latestTimestamp(items) {
  return items
    .map(item => parseDate(item.marketUpdatedAt))
    .filter(Boolean)
    .sort((left, right) => right - left)[0] || null;
}

function createMeta(className) {
  const node = document.createElement('div');
  node.className = className;
  return node;
}

function renderRadarFreshness() {
  const radar = document.querySelector('#radar');
  if (!radar) return false;
  const items = readWatchlist();
  const latest = latestTimestamp(items);
  const heading = radar.querySelector('.panel-head > div');
  if (heading) {
    let summary = heading.querySelector('.radar-freshness-summary');
    if (!summary) {
      summary = createMeta('radar-freshness-summary');
      heading.append(summary);
    }
    summary.innerHTML = `<span>${formatTimestamp(latest)}</span><span>${REFRESH_LABEL}</span>`;
  }

  radar.querySelectorAll('.watch-card').forEach(card => {
    const ticker = card.querySelector('.ticker')?.textContent?.split('•')[0]?.trim();
    const item = items.find(candidate => String(candidate.ticker || '').trim() === ticker);
    let meta = card.querySelector('.radar-card-freshness');
    if (!meta) {
      meta = createMeta('radar-card-freshness');
      card.append(meta);
    }
    const quality = item?.marketError ? 'Source indisponible — valeur de secours' : item?.marketUpdatedAt ? 'Donnée de marché horodatée' : 'Valeur enregistrée localement';
    meta.innerHTML = `<span>${formatTimestamp(item?.marketUpdatedAt)}</span><span>${quality}</span>`;
  });
  return true;
}

function injectStyles() {
  if (document.querySelector('#radarFreshnessStyles')) return;
  const style = document.createElement('style');
  style.id = 'radarFreshnessStyles';
  style.textContent = `
    .radar-freshness-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px;color:var(--muted);font-size:.75rem}
    .radar-freshness-summary span,.radar-card-freshness span{padding:4px 7px;border:1px solid rgba(148,163,184,.16);border-radius:999px;background:rgba(15,23,42,.28)}
    .radar-card-freshness{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;color:var(--muted);font-size:.68rem}
  `;
  document.head.append(style);
}

function mount() {
  injectStyles();
  renderRadarFreshness();
  const watchlist = document.querySelector('#watchlist');
  if (watchlist) new MutationObserver(renderRadarFreshness).observe(watchlist, { childList: true, subtree: true });
  document.querySelector('#refreshBtn')?.addEventListener('click', () => window.setTimeout(renderRadarFreshness, 700));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();

export { REFRESH_LABEL, formatTimestamp, latestTimestamp, renderRadarFreshness };
