export function buildAlerts(watchlist) {
  const alerts = [];
  for (const item of watchlist) {
    if (item.signal === 'Achat') alerts.push({ level: 'buy', title: `${item.ticker} • signal achat`, text: item.note || 'Signal manuel actif.' });
    if (item.change <= -2) alerts.push({ level: 'watch', title: `${item.ticker} baisse de ${Math.abs(item.change).toFixed(2)} %`, text: 'Vérifier si le scénario d’investissement reste valide.' });
    if (item.change >= 3) alerts.push({ level: 'watch', title: `${item.ticker} hausse de ${item.change.toFixed(2)} %`, text: 'Éviter de poursuivre le mouvement sans analyse.' });
  }
  if (!alerts.length) alerts.push({ level: 'neutral', title: 'Aucune alerte prioritaire', text: 'Les seuils surveillés ne sont pas déclenchés.' });
  return alerts;
}
