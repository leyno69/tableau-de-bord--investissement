const REGIMES = Object.freeze({
  supportive: 'supportive',
  balanced: 'balanced',
  restrictive: 'restrictive',
  stressed: 'stressed'
});

function asFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function freezeIndicator({ id, label, value, unit, direction, quality }) {
  return Object.freeze({ id, label, value, unit, direction, quality });
}

export function createMarketContextSnapshot({ indicators = {}, asOf = new Date().toISOString() } = {}) {
  const inflation = asFinite(indicators.inflationRate);
  const policyRate = asFinite(indicators.policyRate);
  const volatility = asFinite(indicators.volatilityIndex);
  const yield10y = asFinite(indicators.yield10y);

  const normalized = Object.freeze([
    freezeIndicator({ id: 'inflation', label: 'Inflation', value: inflation, unit: '%', direction: inflation == null ? 'unknown' : inflation > 3 ? 'high' : inflation < 1.5 ? 'low' : 'normal', quality: inflation == null ? 'missing' : 'reported' }),
    freezeIndicator({ id: 'policy-rate', label: 'Taux directeur', value: policyRate, unit: '%', direction: policyRate == null ? 'unknown' : policyRate >= 4 ? 'restrictive' : policyRate <= 1 ? 'supportive' : 'neutral', quality: policyRate == null ? 'missing' : 'reported' }),
    freezeIndicator({ id: 'volatility', label: 'Volatilité', value: volatility, unit: 'pts', direction: volatility == null ? 'unknown' : volatility >= 30 ? 'stressed' : volatility >= 20 ? 'elevated' : 'calm', quality: volatility == null ? 'missing' : 'reported' }),
    freezeIndicator({ id: 'yield-10y', label: 'Taux 10 ans', value: yield10y, unit: '%', direction: yield10y == null ? 'unknown' : yield10y >= 4 ? 'high' : yield10y <= 2 ? 'low' : 'normal', quality: yield10y == null ? 'missing' : 'reported' })
  ]);

  const available = normalized.filter(indicator => indicator.value != null);
  const stressScore = [
    inflation != null && inflation > 4,
    policyRate != null && policyRate >= 4,
    volatility != null && volatility >= 30,
    yield10y != null && yield10y >= 4.5
  ].filter(Boolean).length;

  const supportiveScore = [
    inflation != null && inflation <= 2,
    policyRate != null && policyRate <= 2,
    volatility != null && volatility < 18,
    yield10y != null && yield10y < 3
  ].filter(Boolean).length;

  const regime = stressScore >= 3
    ? REGIMES.stressed
    : stressScore >= 2
      ? REGIMES.restrictive
      : supportiveScore >= 3
        ? REGIMES.supportive
        : REGIMES.balanced;

  const confidence = normalized.length > 0 ? available.length / normalized.length : 0;

  return Object.freeze({
    regime,
    confidence,
    dataQuality: confidence === 1 ? 'complete' : confidence >= 0.5 ? 'partial' : 'insufficient',
    indicators: normalized,
    asOf
  });
}

export { REGIMES };
