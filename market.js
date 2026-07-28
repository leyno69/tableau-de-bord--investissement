export const defaultWatchlist = [
  { id: 1, name: 'NVIDIA', ticker: 'NVDA', price: 146.8, change: 1.92, signal: 'Surveiller', note: 'Semi-conducteurs / IA' },
  { id: 2, name: 'TSMC', ticker: 'TSM', price: 191.3, change: -0.64, signal: 'Surveiller', note: 'Exposition Taïwan' },
  { id: 3, name: 'Schneider Electric', ticker: 'SU', price: 229.5, change: 0.73, signal: 'Achat', note: 'Électrification / data centers' }
];

export function pseudoRefresh(items) {
  return items.map(item => {
    const delta = (Math.random() - 0.5) * 1.4;
    const nextChange = Number((item.change + delta).toFixed(2));
    const nextPrice = Number((item.price * (1 + delta / 100)).toFixed(2));
    return { ...item, change: nextChange, price: nextPrice };
  });
}
