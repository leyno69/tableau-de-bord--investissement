const HISTORY_KEY = 'leynor-market-history-v1';
const RANGE_DURATION = Object.freeze({
  '1H': 36e5,
  '1J': 864e5,
  '5J': 432e6,
  '1S': 6048e5,
  '1M': 26298e5,
  '6M': 157788e5,
  '1A': 315576e5,
  MAX: Infinity
});

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
}

function selectedSymbol(root) {
  return root.querySelector('.asset-details-head span')?.textContent?.trim() || '';
}

function selectedRange(root) {
  return root.querySelector('[data-range].active')?.dataset.range || '1M';
}

function pointsFor(root) {
  const symbol = selectedSymbol(root);
  const range = selectedRange(root);
  const points = Array.isArray(loadHistory()[symbol]) ? loadHistory()[symbol] : [];
  const minimum = Date.now() - (RANGE_DURATION[range] ?? RANGE_DURATION['1M']);
  return points
    .filter(point => Number.isFinite(Number(point.at)) && Number.isFinite(Number(point.price)))
    .filter(point => range === 'MAX' || Number(point.at) >= minimum)
    .sort((a, b) => Number(a.at) - Number(b.at));
}

function formatMoment(timestamp, range) {
  const date = new Date(Number(timestamp));
  const intraday = range === '1H' || range === '1J';
  return new Intl.DateTimeFormat('fr-FR', intraday
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  ).format(date);
}

function ensureInspector(shell) {
  let inspector = shell.querySelector('.market-chart-inspector');
  if (inspector) return inspector;
  inspector = document.createElement('div');
  inspector.className = 'market-chart-inspector';
  inspector.hidden = true;
  inspector.innerHTML = `
    <div class="market-chart-crosshair" aria-hidden="true"></div>
    <div class="market-chart-point" aria-hidden="true"></div>
    <output class="market-chart-tooltip" aria-live="polite"></output>
  `;
  shell.append(inspector);
  return inspector;
}

function bindChart(root) {
  const svg = root.querySelector('.market-chart');
  const shell = svg?.closest('.chart-shell');
  if (!svg || !shell || svg.dataset.touchInspector === 'true') return;
  svg.dataset.touchInspector = 'true';
  shell.classList.add('chart-shell--interactive');
  const inspector = ensureInspector(shell);
  const crosshair = inspector.querySelector('.market-chart-crosshair');
  const marker = inspector.querySelector('.market-chart-point');
  const tooltip = inspector.querySelector('.market-chart-tooltip');
  let dragging = false;

  const inspect = clientX => {
    const points = pointsFor(root);
    if (points.length < 2) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (points.length - 1));
    const point = points[index];
    const values = points.map(entry => Number(entry.price));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;
    const x = index / (points.length - 1) * 100;
    const y = 100 - ((Number(point.price) - min) / spread) * 90 - 5;
    const first = Number(points[0].price);
    const variation = first ? (Number(point.price) / first - 1) * 100 : 0;
    const range = selectedRange(root);

    inspector.hidden = false;
    crosshair.style.left = `${x}%`;
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    tooltip.style.left = `${Math.max(13, Math.min(87, x))}%`;
    tooltip.innerHTML = `<strong>${money.format(Number(point.price))}</strong><span class="${variation >= 0 ? 'positive' : 'negative'}">${variation >= 0 ? '+' : ''}${variation.toFixed(2)} %</span><small>${formatMoment(point.at, range)}</small>`;
  };

  svg.addEventListener('pointerdown', event => {
    dragging = true;
    svg.setPointerCapture?.(event.pointerId);
    inspect(event.clientX);
  });
  svg.addEventListener('pointermove', event => {
    if (!dragging && event.pointerType !== 'mouse') return;
    inspect(event.clientX);
  });
  svg.addEventListener('pointerup', event => {
    dragging = false;
    svg.releasePointerCapture?.(event.pointerId);
    inspect(event.clientX);
  });
  svg.addEventListener('pointercancel', () => { dragging = false; });
  svg.addEventListener('mouseleave', () => {
    if (!dragging && matchMedia('(hover:hover)').matches) inspector.hidden = true;
  });
  svg.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const rect = svg.getBoundingClientRect();
    const current = Number(inspector.dataset.ratio || 0.5);
    const next = Math.max(0, Math.min(1, current + (event.key === 'ArrowRight' ? 0.05 : -0.05)));
    inspector.dataset.ratio = String(next);
    inspect(rect.left + rect.width * next);
    event.preventDefault();
  });
  svg.tabIndex = 0;
  svg.setAttribute('aria-label', 'Graphique interactif. Faites glisser le doigt pour lire le cours à une date précise.');
}

function installStyles() {
  if (document.querySelector('style[data-market-chart-touch]')) return;
  const style = document.createElement('style');
  style.dataset.marketChartTouch = 'true';
  style.textContent = `
    .chart-shell--interactive{position:relative;isolation:isolate}
    .chart-shell--interactive .market-chart{cursor:crosshair;touch-action:pan-y;outline:none}
    .chart-shell--interactive .market-chart:focus-visible{box-shadow:inset 0 0 0 3px rgba(105,200,255,.65)}
    .market-chart-inspector{position:absolute;inset:0;pointer-events:none;z-index:3}
    .market-chart-inspector[hidden]{display:none}
    .market-chart-crosshair{position:absolute;top:8px;bottom:8px;width:1px;background:linear-gradient(180deg,transparent,rgba(235,244,255,.85),transparent);transform:translateX(-50%)}
    .market-chart-point{position:absolute;width:14px;height:14px;border-radius:50%;background:#09172a;border:3px solid #69c8ff;box-shadow:0 0 0 5px rgba(105,200,255,.18);transform:translate(-50%,-50%)}
    .market-chart-tooltip{position:absolute;top:12px;display:grid;grid-template-columns:auto auto;gap:1px 9px;min-width:138px;padding:9px 11px;border:1px solid rgba(105,200,255,.5);border-radius:12px;background:rgba(7,20,38,.94);box-shadow:0 10px 28px rgba(0,0,0,.36);transform:translateX(-50%);font-variant-numeric:tabular-nums;backdrop-filter:blur(8px)}
    .market-chart-tooltip strong{font-size:.95rem;color:#f3f7ff}
    .market-chart-tooltip span{font-size:.82rem;font-weight:750;text-align:right}
    .market-chart-tooltip small{grid-column:1/-1;color:#9fb2cf;font-size:.72rem}
    @media(max-width:620px){.market-chart-tooltip{top:8px;min-width:126px;padding:8px 9px}.market-chart-point{width:16px;height:16px}}
  `;
  document.head.append(style);
}

function scan() {
  const root = document.getElementById('assetDetailsContent');
  if (root) bindChart(root);
}

installStyles();
new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();

export { bindChart, pointsFor, formatMoment };
