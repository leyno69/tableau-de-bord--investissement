import { buy, createSimulation, sell, simulateDca, summarizeSimulation } from './portfolio-simulator.js';

const STORAGE_KEY = 'leynor-paper-simulation';
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

function loadSimulation() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.isSimulation && Array.isArray(stored.positions) && Array.isArray(stored.transactions)) return stored;
  } catch {}
  return createSimulation({ initialCash: 10000 });
}

let simulation = loadSimulation();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation));
}

function render() {
  const summary = summarizeSimulation(simulation);
  document.querySelector('#simTotal').textContent = money.format(summary.totalValue);
  document.querySelector('#simCash').textContent = money.format(summary.cash);
  document.querySelector('#simPnl').textContent = money.format(summary.pnl);
  document.querySelector('#simPnl').className = summary.pnl >= 0 ? 'positive' : 'negative';
  document.querySelector('#simTransactions').textContent = String(summary.transactionCount);
  document.querySelector('#simPositions').innerHTML = simulation.positions.length
    ? simulation.positions.map(position => `<tr><td><strong>${position.name}</strong><small>${position.ticker} • fictif</small></td><td>${position.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 6 })}</td><td>${money.format(position.avgPrice)}</td><td>${money.format(position.price)}</td><td>${money.format(position.quantity * position.price)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">Aucune position fictive.</td></tr>';
}

function value(selector) {
  return document.querySelector(selector).value;
}

document.querySelector('#executeSimulation').addEventListener('click', () => {
  const status = document.querySelector('#simStatus');
  try {
    const operation = value('#simOperation');
    const ticker = value('#simTicker');
    const price = Number(value('#simPrice'));
    if (operation === 'buy') buy(simulation, { ticker, name: value('#simName'), amount: Number(value('#simAmount')), price });
    else sell(simulation, { ticker, quantity: Number(value('#simQuantity')), price });
    persist();
    render();
    status.textContent = `Opération ${operation === 'buy' ? 'd’achat' : 'de vente'} fictive enregistrée. Aucune donnée réelle n’a été modifiée.`;
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector('#resetSimulation').addEventListener('click', () => {
  simulation = createSimulation({ initialCash: 10000 });
  persist();
  render();
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
    target.innerHTML = `<div class="alert"><strong>Simulation impossible</strong><small>${error.message}</small></div>`;
  }
});

render();
document.querySelector('#runDca').click();
