import { searchInstruments, verifyMarketSymbol, instrumentType, regionFromCandidate } from './instrument-resolver.js';

const PORTFOLIO_KEY = 'invest-dashboard-portfolio';
const WATCHLIST_KEY = 'invest-dashboard-watchlist';

function makeResolver(form, kind) {
  const grid = form.querySelector('.form-grid');
  if (!grid) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'field instrument-resolver';
  wrapper.style.gridColumn = '1 / -1';

  const label = document.createElement('span');
  label.textContent = 'Rechercher un instrument';

  const controls = document.createElement('div');
  controls.style.display = 'grid';
  controls.style.gridTemplateColumns = '1fr minmax(130px, auto) auto';
  controls.style.gap = '8px';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Ex. Nvidia, Airbus, MSCI World, WPEA ou un ISIN';
  input.autocomplete = 'off';

  const typeFilter = document.createElement('select');
  typeFilter.setAttribute('aria-label', 'Type d’instrument recherché');
  [
    ['Tous', 'all'],
    ['Actions', 'stock'],
    ['ETF', 'etf'],
    ['Fonds', 'fund'],
    ['Obligations', 'bond'],
    ['Indices', 'index'],
    ['Crypto', 'crypto']
  ].forEach(([labelText, value]) => typeFilter.add(new Option(labelText, value)));

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn secondary';
  button.textContent = 'Rechercher';

  const select = document.createElement('select');
  select.hidden = true;
  select.setAttribute('aria-label', 'Résultats de recherche instrument');

  const status = document.createElement('small');
  status.textContent = 'Vous pouvez saisir un nom courant, un ticker ou un ISIN. La cotation choisie est vérifiée avant remplissage.';

  controls.append(input, typeFilter, button);
  wrapper.append(label, controls, select, status);
  grid.prepend(wrapper);

  let candidates = [];
  let selected = null;

  async function runSearch() {
    const query = input.value.trim();
    if (query.length < 2) {
      status.textContent = 'Saisissez au moins 2 caractères.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Recherche…';
    status.textContent = 'Recherche EODHD en cours…';
    select.hidden = true;

    try {
      candidates = await searchInstruments(query, typeFilter.value);
      select.innerHTML = '';

      if (!candidates.length) {
        status.textContent = 'Aucun instrument trouvé.';
        return;
      }

      select.add(new Option('Choisir une cotation…', ''));
      candidates.forEach((candidate, index) => {
        const primary = candidate.isPrimary ? ' • principale' : '';
        const isin = candidate.isin ? ` • ${candidate.isin}` : '';
        const currency = candidate.currency ? ` • ${candidate.currency}` : '';
        const assetType = candidate.type ? ` • ${candidate.type}` : '';
        select.add(new Option(
          `${candidate.name || candidate.code} — ${candidate.marketSymbol}${assetType}${currency}${isin}${primary}`,
          String(index)
        ));
      });

      select.hidden = false;
      status.textContent = `${candidates.length} cotation${candidates.length > 1 ? 's' : ''} trouvée${candidates.length > 1 ? 's' : ''}. Sélectionnez celle à utiliser.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Rechercher';
    }
  }

  async function applyCandidate(candidate) {
    selected = null;
    select.disabled = true;
    status.textContent = `Vérification de ${candidate.marketSymbol}…`;

    try {
      const quote = await verifyMarketSymbol(candidate.marketSymbol);
      selected = candidate;

      const setValue = (name, value) => {
        const field = form.elements.namedItem(name);
        if (field && value !== undefined && value !== null && value !== '') field.value = value;
      };

      setValue('name', candidate.name || candidate.code);
      setValue('ticker', candidate.code);
      setValue('marketSymbol', candidate.marketSymbol);
      setValue('price', Number.isFinite(Number(quote.price)) ? Number(quote.price).toFixed(4) : candidate.previousClose);

      if (kind === 'position') {
        setValue('type', instrumentType(candidate.type));
        setValue('region', regionFromCandidate(candidate));
      } else {
        setValue('change', Number.isFinite(Number(quote.percentChange)) ? Number(quote.percentChange).toFixed(2) : 0);
      }

      status.textContent = `${candidate.marketSymbol} vérifié par EODHD${candidate.isin ? ` • ISIN ${candidate.isin}` : ''}.`;
    } catch (error) {
      status.textContent = `${candidate.marketSymbol} n'a pas pu être vérifié : ${error.message}`;
    } finally {
      select.disabled = false;
    }
  }

  button.addEventListener('click', runSearch);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });
  select.addEventListener('change', () => {
    const index = Number(select.value);
    if (Number.isInteger(index) && candidates[index]) applyCandidate(candidates[index]);
  });

  const saveButton = form.querySelector(kind === 'position' ? '#savePositionBtn' : '#saveWatchBtn');
  saveButton?.addEventListener('click', () => {
    if (!selected?.isin) return;
    const ticker = String(form.elements.namedItem('ticker')?.value || '').trim().toUpperCase();
    const marketSymbol = String(form.elements.namedItem('marketSymbol')?.value || '').trim().toUpperCase();
    const isin = selected.isin;

    window.setTimeout(() => {
      try {
        const key = kind === 'position' ? PORTFOLIO_KEY : WATCHLIST_KEY;
        const parsed = JSON.parse(localStorage.getItem(key) || (kind === 'position' ? '{"positions":[]}' : '[]'));
        const items = kind === 'position' ? parsed.positions : parsed;
        if (!Array.isArray(items)) return;
        const match = [...items].reverse().find(item => item.ticker === ticker && item.marketSymbol === marketSymbol);
        if (!match) return;
        match.isin = isin;
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch (error) {
        console.warn('Impossible de mémoriser l’ISIN résolu.', error);
      }
    }, 0);
  }, { capture: true });
}

function init() {
  const positionForm = document.querySelector('#positionForm');
  const watchForm = document.querySelector('#watchForm');
  if (positionForm) makeResolver(positionForm, 'position');
  if (watchForm) makeResolver(watchForm, 'watch');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
