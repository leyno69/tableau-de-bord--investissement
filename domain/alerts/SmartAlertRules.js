function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requirePositiveRate(value, fallback, field) {
  const number = value == null ? fallback : Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${field} doit être un nombre strictement positif.`);
  }
  return number;
}

function positionIdentity(position) {
  return String(position?.isin || position?.ticker || position?.name || 'position').trim();
}

function positionLabel(position) {
  return String(position?.name || position?.ticker || position?.isin || 'Position').trim();
}

export class ConcentrationAlertRule {
  constructor({ warningRate = 0.25, criticalRate = 0.40 } = {}) {
    this.id = 'portfolio-concentration';
    this.warningRate = requirePositiveRate(warningRate, 0.25, 'warningRate');
    this.criticalRate = requirePositiveRate(criticalRate, 0.40, 'criticalRate');
    if (this.criticalRate <= this.warningRate) {
      throw new RangeError('criticalRate doit être supérieur à warningRate.');
    }
    Object.freeze(this);
  }

  evaluate(context = {}) {
    const positions = Array.isArray(context.positions) ? context.positions : [];
    const valued = positions.map(position => ({
      position,
      value: Math.max(0, (asFiniteNumber(position?.quantity) ?? 0) * (asFiniteNumber(position?.price) ?? 0))
    }));
    const total = valued.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return Object.freeze([]);

    return Object.freeze(valued
      .filter(item => item.value / total >= this.warningRate)
      .map(item => {
        const rate = item.value / total;
        const severity = rate >= this.criticalRate ? 'CRITICAL' : 'WARNING';
        const identity = positionIdentity(item.position);
        return Object.freeze({
          type: 'CONCENTRATION',
          severity,
          message: `${positionLabel(item.position)} représente ${(rate * 100).toFixed(1)} % du portefeuille.`,
          fingerprint: `${this.id}:${identity}:${severity}`,
          context: Object.freeze({ identity, rate, value: item.value, total })
        });
      }));
  }
}

export class PriceMoveAlertRule {
  constructor({ warningRate = 0.05, criticalRate = 0.10 } = {}) {
    this.id = 'daily-price-move';
    this.warningRate = requirePositiveRate(warningRate, 0.05, 'warningRate');
    this.criticalRate = requirePositiveRate(criticalRate, 0.10, 'criticalRate');
    if (this.criticalRate <= this.warningRate) {
      throw new RangeError('criticalRate doit être supérieur à warningRate.');
    }
    Object.freeze(this);
  }

  evaluate(context = {}) {
    const positions = Array.isArray(context.positions) ? context.positions : [];
    return Object.freeze(positions.flatMap(position => {
      const changeRate = asFiniteNumber(position?.changeRate);
      if (changeRate == null || Math.abs(changeRate) < this.warningRate) return [];
      const severity = Math.abs(changeRate) >= this.criticalRate ? 'CRITICAL' : 'WARNING';
      const direction = changeRate > 0 ? 'progresse' : 'recule';
      const identity = positionIdentity(position);
      return [Object.freeze({
        type: 'PRICE_MOVE',
        severity,
        message: `${positionLabel(position)} ${direction} de ${(Math.abs(changeRate) * 100).toFixed(1)} % sur la période observée.`,
        fingerprint: `${this.id}:${identity}:${severity}:${changeRate > 0 ? 'up' : 'down'}`,
        context: Object.freeze({ identity, changeRate, observedAt: context.observedAt ?? null })
      })];
    }));
  }
}

export class VolatilityAlertRule {
  constructor({ warningRate = 0.25, criticalRate = 0.40 } = {}) {
    this.id = 'position-volatility';
    this.warningRate = requirePositiveRate(warningRate, 0.25, 'warningRate');
    this.criticalRate = requirePositiveRate(criticalRate, 0.40, 'criticalRate');
    if (this.criticalRate <= this.warningRate) {
      throw new RangeError('criticalRate doit être supérieur à warningRate.');
    }
    Object.freeze(this);
  }

  evaluate(context = {}) {
    const positions = Array.isArray(context.positions) ? context.positions : [];
    return Object.freeze(positions.flatMap(position => {
      const volatilityRate = asFiniteNumber(position?.volatilityRate);
      if (volatilityRate == null || volatilityRate < this.warningRate) return [];
      const severity = volatilityRate >= this.criticalRate ? 'CRITICAL' : 'WARNING';
      const identity = positionIdentity(position);
      return [Object.freeze({
        type: 'VOLATILITY',
        severity,
        message: `La volatilité annualisée de ${positionLabel(position)} atteint ${(volatilityRate * 100).toFixed(1)} %.`,
        fingerprint: `${this.id}:${identity}:${severity}`,
        context: Object.freeze({ identity, volatilityRate, window: position?.volatilityWindow ?? null })
      })];
    }));
  }
}

export function createDefaultSmartAlertRules(options = {}) {
  return Object.freeze([
    new ConcentrationAlertRule(options.concentration),
    new PriceMoveAlertRule(options.priceMove),
    new VolatilityAlertRule(options.volatility)
  ]);
}
