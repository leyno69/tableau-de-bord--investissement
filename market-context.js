import { createMarketContextSnapshot } from './domain/market/MarketContextSnapshot.js';

const REGIME_LABELS = Object.freeze({
  supportive: 'Contexte favorable',
  balanced: 'Contexte équilibré',
  restrictive: 'Contexte restrictif',
  stressed: 'Marché sous tension'
});

export function buildMarketContextView(input = {}) {
  const snapshot = createMarketContextSnapshot(input);
  return Object.freeze({
    title: 'Contexte de marché',
    regime: snapshot.regime,
    regimeLabel: REGIME_LABELS[snapshot.regime],
    confidenceLabel: `${Math.round(snapshot.confidence * 100)} % des données disponibles`,
    dataQuality: snapshot.dataQuality,
    asOf: snapshot.asOf,
    indicators: Object.freeze(snapshot.indicators.map(indicator => Object.freeze({
      ...indicator,
      displayValue: indicator.value == null ? 'Donnée indisponible' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(indicator.value)} ${indicator.unit}`
    })))
  });
}

export { REGIME_LABELS };
