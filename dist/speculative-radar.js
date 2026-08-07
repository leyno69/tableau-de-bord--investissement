const REQUIRED_INTRADAY_FIELDS = Object.freeze([
  'price', 'timestamp', 'volume', 'averageVolume', 'spreadPct', 'volatilityPct', 'liquidityScore'
]);

export function assessIntradayReadiness(snapshot = {}) {
  const missing = REQUIRED_INTRADAY_FIELDS.filter(field => !Number.isFinite(Number(snapshot[field])) && field !== 'timestamp');
  if (!snapshot.timestamp || Number.isNaN(new Date(snapshot.timestamp).getTime())) missing.push('timestamp');
  const ageMs = snapshot.timestamp ? Date.now() - new Date(snapshot.timestamp).getTime() : Infinity;
  const stale = ageMs > 5 * 60 * 1000;
  const ready = missing.length === 0 && !stale;
  return Object.freeze({
    ready,
    stale,
    missing: Object.freeze([...new Set(missing)]),
    ageMs,
    reason: ready ? 'Données intrajournalières suffisantes' : stale ? 'Données trop anciennes pour un signal très court terme' : 'Données intrajournalières incomplètes'
  });
}

export function buildSpeculativeSignal(snapshot = {}) {
  const readiness = assessIntradayReadiness(snapshot);
  if (!readiness.ready) {
    return Object.freeze({
      status: 'blocked',
      direction: null,
      confidence: 0,
      readiness,
      expiresAt: null,
      warnings: Object.freeze([
        'Aucun signal exploitable tant que prix, volume, spread, volatilité, liquidité et horodatage ne sont pas disponibles.',
        'Cette rubrique est spéculative et ne constitue pas un ordre d’achat ou de vente.'
      ])
    });
  }

  const volumeRatio = Number(snapshot.volume) / Math.max(1, Number(snapshot.averageVolume));
  const momentum = Number(snapshot.momentumPct || 0);
  const spreadPenalty = Math.min(1, Number(snapshot.spreadPct) / 1.5);
  const liquidity = Math.min(1, Math.max(0, Number(snapshot.liquidityScore) / 100));
  const raw = Math.min(1, Math.abs(momentum) / 3 * 0.45 + Math.min(volumeRatio, 3) / 3 * 0.25 + liquidity * 0.2 + (1 - spreadPenalty) * 0.1);
  const confidence = Math.round(raw * 100);
  const direction = momentum > 0 ? 'hausse' : momentum < 0 ? 'baisse' : 'neutre';
  const expiresAt = new Date(new Date(snapshot.timestamp).getTime() + 15 * 60 * 1000).toISOString();

  return Object.freeze({
    status: confidence >= 60 && direction !== 'neutre' ? 'watch' : 'insufficient-edge',
    direction,
    confidence,
    readiness,
    expiresAt,
    warnings: Object.freeze([
      'Signal expérimental à durée de vie courte.',
      'Vérifier le spread, la liquidité et le risque de perte avant toute décision.'
    ])
  });
}

export { REQUIRED_INTRADAY_FIELDS };
