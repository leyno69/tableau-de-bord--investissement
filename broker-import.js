import { parseDelimited, normalizeBrokerRows, detectDuplicates, buildPortfolioPatch } from './broker-import-core.js';

const KEYS = {
  portfolio: 'invest-dashboard-portfolio',
  imports: 'leynor-broker-import-history-v1',
  fingerprints: 'leynor-broker-import-fingerprints-v1'
};

const state = {
  file: null,
  broker: 'trade-republic',
  rows: [],
  parsed: false
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function money(value) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }

function ensureUi() {
  if (document.getElementById('brokerImportDialog')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'broker-import.css';
  document.head.append(link);

  const button = document.createElement('button');
  button.id = 'openBrokerImport';
  button.className = 'btn secondary';
  button.textContent = '⇩ Importer un portefeuille';
  const anchor = document.getElementById('addPositionBtn');
  anchor?.parentElement?.append(button);

  const dialog = document.createElement('dialog');
  dialog.id = 'brokerImportDialog';
  dialog.className = 'broker-import-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="import-shell" id="brokerImportForm">
      <header class="import-head">
        <div><p class="eyebrow">IMPORT COURTIER</p><h2>Importer votre portefeuille</h2><span>Vos documents restent sur cet appareil pendant l’analyse locale.</span></div>
        <button value="cancel" class="icon-btn" aria-label="Fermer">×</button>
      </header>

      <section class="import-step">
        <div class="import-grid">
          <label class="field"><span>Courtier</span><select id="importBroker"><option value="trade-republic">Trade Republic</option><option value="revolut">Revolut</option><option value="generic">Autre courtier</option></select></label>
          <label class="import-drop" for="brokerImportFile"><strong>Choisir un CSV ou un PDF</strong><small>CSV traité automatiquement. PDF préparé pour validation manuelle contrôlée.</small><input id="brokerImportFile" type="file" accept=".csv,.txt,.tsv,.pdf,text/csv,application/pdf" /></label>
        </div>
        <div class="import-actions"><button type="button" class="btn" id="parseBrokerImport">Analyser le document</button><button type="button" class="btn secondary" id="downloadImportTemplate">Télécharger un modèle CSV</button></div>
        <p class="import-status" id="brokerImportStatus">Aucun document sélectionné.</p>
      </section>

      <section class="import-step" id="importReview" hidden>
        <div class="panel-head"><div><p class="eyebrow">VÉRIFICATION OBLIGATOIRE</p><h3>Opérations reconnues</h3></div><span id="importSummary" class="badge"></span></div>
        <div class="import-warning">LEYNOR ne modifie rien avant votre confirmation. Les lignes incomplètes et les doublons sont ignorés.</div>
        <div class="import-table-wrap"><table class="import-table"><thead><tr><th>Inclure</th><th>Date</th><th>Opération</th><th>Actif</th><th>Qté</th><th>Prix</th><th>État</th></tr></thead><tbody id="importRows"></tbody></table></div>
        <div class="import-actions"><button type="button" class="btn" id="confirmBrokerImport">Confirmer l’import</button><button type="button" class="btn secondary" id="resetBrokerImport">Recommencer</button></div>
      </section>

      <section class="import-step">
        <div class="panel-head"><div><p class="eyebrow">HISTORIQUE</p><h3>Imports précédents</h3></div></div>
        <div id="importHistory" class="import-history"></div>
      </section>

      <section class="import-step future-sync">
        <div><p class="eyebrow">CONNEXION AUTOMATIQUE</p><h3>Architecture prête</h3><p>La connexion directe sera activée uniquement via une API officielle ou un agrégateur autorisé. LEYNOR ne demandera jamais votre code PIN, mot de passe ou code SMS.</p></div>
        <button type="button" class="btn secondary" disabled>Connecter le courtier — bientôt</button>
      </section>
    </form>`;
  document.body.append(dialog);
  bind(dialog, button);
  renderHistory();
}

function bind(dialog, button) {
  button?.addEventListener('click', () => { renderHistory(); dialog.showModal(); });
  document.getElementById('importBroker').addEventListener('change', event => { state.broker = event.target.value; });
  document.getElementById('brokerImportFile').addEventListener('change', event => {
    state.file = event.target.files?.[0] || null;
    setStatus(state.file ? `${state.file.name} sélectionné.` : 'Aucun document sélectionné.');
  });
  document.getElementById('parseBrokerImport').addEventListener('click', parseFile);
  document.getElementById('confirmBrokerImport').addEventListener('click', confirmImport);
  document.getElementById('resetBrokerImport').addEventListener('click', reset);
  document.getElementById('downloadImportTemplate').addEventListener('click', downloadTemplate);
}

async function parseFile() {
  if (!state.file) return setStatus('Sélectionnez d’abord un document.', true);
  const extension = state.file.name.split('.').pop().toLowerCase();
  if (extension === 'pdf' || state.file.type === 'application/pdf') {
    state.rows = [manualPdfPlaceholder(state.file)];
    state.parsed = true;
    setStatus('PDF détecté. La bêta ne lit pas encore automatiquement son contenu : utilisez le modèle CSV ou saisissez les données après export.', true);
    renderRows();
    return;
  }
  try {
    const text = await state.file.text();
    const parsed = parseDelimited(text);
    if (!parsed.rows.length) throw new Error('Aucune ligne détectée.');
    const normalized = normalizeBrokerRows(parsed.rows, { broker: state.broker, fileName: state.file.name });
    state.rows = detectDuplicates(normalized, load(KEYS.fingerprints, []));
    state.parsed = true;
    setStatus(`${state.rows.length} ligne${state.rows.length > 1 ? 's' : ''} détectée${state.rows.length > 1 ? 's' : ''}.`);
    renderRows();
  } catch (error) {
    setStatus(`Import impossible : ${error.message}`, true);
  }
}

function renderRows() {
  const review = document.getElementById('importReview');
  review.hidden = false;
  const body = document.getElementById('importRows');
  body.innerHTML = state.rows.map((row, index) => {
    const valid = row.status?.level === 'ok' && !row.duplicate;
    const label = row.duplicate ? 'Doublon' : row.status?.level === 'ok' ? 'Prêt' : row.status?.messages?.join(', ') || 'À vérifier';
    return `<tr class="${valid ? '' : 'invalid'}">
      <td><input type="checkbox" data-include="${index}" ${valid ? 'checked' : ''} ${valid ? '' : 'disabled'} /></td>
      <td>${escapeHtml(row.date || '—')}</td>
      <td>${escapeHtml(operationLabel(row.operation))}</td>
      <td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.ticker || row.isin || '')}</small></td>
      <td>${Number.isFinite(row.quantity) ? row.quantity : '—'}</td>
      <td>${Number.isFinite(row.avgPrice) ? money(row.avgPrice) : '—'}</td>
      <td><span class="badge ${valid ? 'ok' : ''}">${escapeHtml(label)}</span></td>
    </tr>`;
  }).join('');
  const ready = state.rows.filter(row => row.status?.level === 'ok' && !row.duplicate).length;
  document.getElementById('importSummary').textContent = `${ready}/${state.rows.length} prêtes`;
}

function confirmImport() {
  if (!state.parsed) return;
  const selected = [...document.querySelectorAll('[data-include]:checked')].map(input => state.rows[Number(input.dataset.include)]);
  if (!selected.length) return setStatus('Aucune ligne valide sélectionnée.', true);
  const current = load(KEYS.portfolio, { cash: 0, positions: [] });
  const result = buildPortfolioPatch(selected, current);
  save(KEYS.portfolio, result.portfolio);
  const fingerprints = new Set(load(KEYS.fingerprints, []));
  result.applied.forEach(row => fingerprints.add(row.id));
  save(KEYS.fingerprints, [...fingerprints]);
  const history = load(KEYS.imports, []);
  history.unshift({
    id: `batch_${Date.now()}`,
    at: new Date().toISOString(),
    broker: state.broker,
    fileName: state.file?.name || 'import manuel',
    applied: result.applied.length,
    skipped: result.skipped.length
  });
  save(KEYS.imports, history.slice(0, 50));
  setStatus(`${result.applied.length} opération${result.applied.length > 1 ? 's' : ''} importée${result.applied.length > 1 ? 's' : ''}. Rechargement du portefeuille…`);
  renderHistory();
  window.setTimeout(() => location.reload(), 900);
}

function renderHistory() {
  const target = document.getElementById('importHistory');
  if (!target) return;
  const history = load(KEYS.imports, []);
  target.innerHTML = history.length ? history.map(item => `<article><div><strong>${escapeHtml(brokerLabel(item.broker))}</strong><small>${escapeHtml(item.fileName)}</small></div><div><span>${new Date(item.at).toLocaleString('fr-FR')}</span><small>${item.applied} intégrée${item.applied > 1 ? 's' : ''} · ${item.skipped} ignorée${item.skipped > 1 ? 's' : ''}</small></div></article>`).join('') : '<p class="empty">Aucun import enregistré sur cet appareil.</p>';
}

function reset() {
  state.file = null; state.rows = []; state.parsed = false;
  document.getElementById('brokerImportFile').value = '';
  document.getElementById('importReview').hidden = true;
  setStatus('Aucun document sélectionné.');
}

function downloadTemplate() {
  const csv = 'Date;Operation;Name;Ticker;ISIN;Quantity;Avg Price;Amount;Currency;Fees;Cash\n01/08/2026;Achat;Exemple ETF Monde;WPEA;IE0002XZSHO1;2;5,50;11,00;EUR;1,00;\n01/08/2026;Solde espèces;;;;;;;EUR;;7,42\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'modele-import-leynor.csv'; anchor.click();
  URL.revokeObjectURL(url);
}

function manualPdfPlaceholder(file) {
  return {
    id: `pdf_${Date.now()}`,
    source: { broker: state.broker, fileName: file.name, row: 0 },
    date: '', operation: 'unknown', name: file.name, ticker: '', isin: '', type: '', quantity: NaN, avgPrice: NaN, amount: NaN, cash: NaN, fees: 0, currency: 'EUR', duplicate: false,
    status: { level: 'error', messages: ['Extraction PDF automatique non activée'] }
  };
}

function setStatus(message, warning = false) {
  const node = document.getElementById('brokerImportStatus');
  node.textContent = message;
  node.classList.toggle('warning', warning);
}
function operationLabel(value) { return ({ buy: 'Achat', sell: 'Vente', cash: 'Solde espèces', cashflow: 'Flux', unknown: 'Non reconnu' })[value] || value; }
function brokerLabel(value) { return ({ 'trade-republic': 'Trade Republic', revolut: 'Revolut', generic: 'Autre courtier' })[value] || value; }

ensureUi();
