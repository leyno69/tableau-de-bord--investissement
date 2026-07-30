function requireThreshold(value, field) {
  const threshold = Number(value);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError(`${field} doit être compris entre 0 et 1.`);
  }
  return threshold;
}

function requirePositiveDuration(value, field) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError(`${field} doit être positif ou nul.`);
  }
  return duration;
}

export class ConcentrationAlertRule {
  constructor({ threshold = 0.25, severity = 'WARNING' } = {}) {
    this.id = 'portfolio.concentration';
    this.threshold = requireThreshold(threshold, 'threshold');
    this.severity = severity;
    Object.freeze(this);
  }

  evaluate({ allocation }) {
    if (!allocation || !Array.isArray(allocation.holdings)) {
      return [];
    }

    return allocation.holdings
      .filter(item => item.kind === 'POSITION' && item.weight !== null && item.weight > this.threshold)
      .map(item => ({
        type: 'CONCENTRATION',
        severity: this.severity,
        message: `${item.assetId} représente ${(item.weight * 100).toFixed(2)} % du portefeuille.`,
        fingerprint: `${this.id}:${item.assetId}:${this.threshold}`,
        context: {
          assetId: item.assetId,
          weight: item.weight,
          threshold: this.threshold
        }
      }));
  }
}

export class DrawdownAlertRule {
  constructor({ threshold = 0.15, severity = 'CRITICAL' } = {}) {
    this.id = 'portfolio.drawdown';
    this.threshold = requireThreshold(threshold, 'threshold');
    this.severity = severity;
    Object.freeze(this);
  }

  evaluate({ analytics }) {
    const drawdown = analytics?.maxDrawdown;
    if (!drawdown || drawdown.rate === null || Math.abs(drawdown.rate) < this.threshold) {
      return [];
    }

    return {
      type: 'DRAWDOWN',
      severity: this.severity,
      message: `Le drawdown maximal atteint ${(Math.abs(drawdown.rate) * 100).toFixed(2)} %.`,
      fingerprint: `${this.id}:${drawdown.peakAt}:${drawdown.troughAt}:${this.threshold}`,
      context: {
        rate: drawdown.rate,
        threshold: this.threshold,
        peakAt: drawdown.peakAt,
        troughAt: drawdown.troughAt
      }
    };
  }
}

export class StaleMarketDataAlertRule {
  constructor({ maxAgeMilliseconds, severity = 'WARNING', now = () => new Date() }) {
    this.id = 'market-data.stale';
    this.maxAgeMilliseconds = requirePositiveDuration(maxAgeMilliseconds, 'maxAgeMilliseconds');
    if (typeof now !== 'function') {
      throw new TypeError('now doit être une fonction.');
    }
    this.severity = severity;
    this.now = now;
    Object.freeze(this);
  }

  evaluate({ quotes }) {
    if (!Array.isArray(quotes)) {
      return [];
    }

    const nowTimestamp = this.now() instanceof Date
      ? this.now().getTime()
      : Date.parse(this.now());

    if (!Number.isFinite(nowTimestamp)) {
      throw new TypeError('now doit retourner une date valide.');
    }

    return quotes
      .map(entry => entry?.quote ?? entry)
      .filter(quote => quote && typeof quote.quotedAt === 'string')
      .map(quote => ({ quote, age: nowTimestamp - Date.parse(quote.quotedAt) }))
      .filter(({ age }) => Number.isFinite(age) && age > this.maxAgeMilliseconds)
      .map(({ quote, age }) => ({
        type: 'STALE_MARKET_DATA',
        severity: this.severity,
        message: `La cotation de ${quote.assetId} est périmée.`,
        fingerprint: `${this.id}:${quote.assetId}:${quote.quotedAt}:${this.maxAgeMilliseconds}`,
        context: {
          assetId: quote.assetId,
          quotedAt: quote.quotedAt,
          ageMilliseconds: age,
          maxAgeMilliseconds: this.maxAgeMilliseconds,
          source: quote.source
        }
      }));
  }
}
