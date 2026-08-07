if (typeof document !== 'undefined' && !document.querySelector('link[data-leynor-financial-cards]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './leynor-financial-cards.css';
  link.dataset.leynorFinancialCards = 'true';
  document.head.append(link);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatRate(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero'
  }).format(value);
}

export function buildFinancialCards(portfolio = {}) {
  const positions = Array.isArray(portfolio.positions) ? portfolio.positions : [];
  const currency = String(portfolio.currency || 'EUR').toUpperCase();
  const cash = asNumber(portfolio.cash);
  const invested = positions.reduce((sum, position) => sum + asNumber(position.quantity) * asNumber(position.avgPrice), 0);
  const positionsValue = positions.reduce((sum, position) => sum + asNumber(position.quantity) * asNumber(position.price), 0);
  const totalValue = positionsValue + cash;
  const performanceRate = invested > 0 ? (positionsValue - invested) / invested : 0;
  const largestPositionValue = positions.reduce((largest, position) => {
    const value = asNumber(position.quantity) * asNumber(position.price);
    return Math.max(largest, value);
  }, 0);
  const concentrationRate = positionsValue > 0 ? largestPositionValue / positionsValue : 0;

  if (totalValue <= 0 && invested <= 0) return Object.freeze([]);

  return Object.freeze([
    Object.freeze({ id: 'value', label: 'Valeur estimée', value: formatCurrency(totalValue, currency), tone: 'neutral' }),
    Object.freeze({ id: 'performance', label: 'Performance latente', value: formatRate(performanceRate), tone: performanceRate > 0 ? 'positive' : performanceRate < 0 ? 'negative' : 'neutral' }),
    Object.freeze({ id: 'cash', label: 'Liquidités', value: formatCurrency(cash, currency), tone: 'neutral' }),
    Object.freeze({ id: 'concentration', label: 'Plus forte position', value: formatRate(concentrationRate), tone: concentrationRate >= 0.35 ? 'warning' : 'neutral' })
  ]);
}

export function normalizeFinancialCards(cards) {
  if (!Array.isArray(cards)) return Object.freeze([]);
  return Object.freeze(cards.slice(0, 6).map(card => Object.freeze({
    id: String(card?.id || card?.label || 'metric'),
    label: String(card?.label || 'Indicateur'),
    value: String(card?.value ?? '—'),
    tone: ['positive', 'negative', 'warning', 'neutral'].includes(card?.tone) ? card.tone : 'neutral'
  })));
}
