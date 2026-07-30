import { Money } from '../../domain/money/Money.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';

/**
 * Analyse une série chronologique de valorisations.
 *
 * Les rendements calculés ici sont de simples variations entre snapshots.
 * Ils ne neutralisent pas les dépôts et retraits et ne constituent donc pas
 * encore un TWR.
 */
export class AnalyzePortfolioSeries {
  execute({ snapshots, periodsPerYear = null }) {
    if (!Array.isArray(snapshots)) {
      throw new TypeError('snapshots doit être un tableau.');
    }

    if (periodsPerYear !== null) {
      const normalizedPeriods = Number(periodsPerYear);

      if (!Number.isInteger(normalizedPeriods) || normalizedPeriods <= 0) {
        throw new RangeError('periodsPerYear doit être un entier strictement positif.');
      }

      periodsPerYear = normalizedPeriods;
    }

    const ordered = [...snapshots].sort(
      (left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt)
    );

    this.#validateSeries(ordered);

    if (ordered.length === 0) {
      return Object.freeze({
        portfolioId: null,
        currency: null,
        snapshots: Object.freeze([]),
        returns: Object.freeze([]),
        startValue: null,
        endValue: null,
        absoluteChange: null,
        cumulativeReturn: null,
        averagePeriodicReturn: null,
        periodicVolatility: null,
        annualizedVolatility: null,
        maxDrawdown: null
      });
    }

    const first = ordered[0];
    const last = ordered.at(-1);
    const returns = [];

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const rate = previous.totalValue.amount === 0
        ? null
        : (current.totalValue.amount / previous.totalValue.amount) - 1;

      returns.push(Object.freeze({
        from: previous.capturedAt,
        to: current.capturedAt,
        startValue: previous.totalValue,
        endValue: current.totalValue,
        rate
      }));
    }

    const numericReturns = returns
      .map(entry => entry.rate)
      .filter(rate => rate !== null);

    const averagePeriodicReturn = numericReturns.length === 0
      ? null
      : numericReturns.reduce((sum, value) => sum + value, 0) /
        numericReturns.length;

    const periodicVolatility = numericReturns.length < 2
      ? null
      : Math.sqrt(
          numericReturns.reduce(
            (sum, value) => sum + ((value - averagePeriodicReturn) ** 2),
            0
          ) / (numericReturns.length - 1)
        );

    const cumulativeReturn = first.totalValue.amount === 0
      ? null
      : (last.totalValue.amount / first.totalValue.amount) - 1;

    const maxDrawdown = this.#calculateMaxDrawdown(ordered);

    return Object.freeze({
      portfolioId: first.portfolioId,
      currency: first.totalValue.currency,
      snapshots: Object.freeze(ordered),
      returns: Object.freeze(returns),
      startValue: first.totalValue,
      endValue: last.totalValue,
      absoluteChange: new Money(
        last.totalValue.amount - first.totalValue.amount,
        first.totalValue.currency
      ),
      cumulativeReturn,
      averagePeriodicReturn,
      periodicVolatility,
      annualizedVolatility: periodicVolatility === null || periodsPerYear === null
        ? null
        : periodicVolatility * Math.sqrt(periodsPerYear),
      maxDrawdown
    });
  }

  #validateSeries(snapshots) {
    let portfolioId = null;
    let currency = null;
    let previousTimestamp = null;

    for (const snapshot of snapshots) {
      if (!(snapshot instanceof PortfolioSnapshot)) {
        throw new TypeError(
          'Chaque snapshot doit être une instance de PortfolioSnapshot.'
        );
      }

      portfolioId ??= snapshot.portfolioId;
      currency ??= snapshot.totalValue.currency;

      if (snapshot.portfolioId !== portfolioId) {
        throw new TypeError('Une série ne peut contenir plusieurs portefeuilles.');
      }

      if (snapshot.totalValue.currency !== currency) {
        throw new TypeError('Une série ne peut mélanger plusieurs devises.');
      }

      const timestamp = Date.parse(snapshot.capturedAt);

      if (timestamp === previousTimestamp) {
        throw new RangeError('Deux snapshots ne peuvent partager le même horodatage.');
      }

      previousTimestamp = timestamp;
    }
  }

  #calculateMaxDrawdown(snapshots) {
    let peak = snapshots[0];
    let deepest = null;

    for (const snapshot of snapshots) {
      if (snapshot.totalValue.amount > peak.totalValue.amount) {
        peak = snapshot;
      }

      const rate = peak.totalValue.amount === 0
        ? null
        : (snapshot.totalValue.amount / peak.totalValue.amount) - 1;

      if (rate !== null && (deepest === null || rate < deepest.rate)) {
        deepest = {
          rate,
          peakAt: peak.capturedAt,
          troughAt: snapshot.capturedAt,
          peakValue: peak.totalValue,
          troughValue: snapshot.totalValue,
          loss: new Money(
            snapshot.totalValue.amount - peak.totalValue.amount,
            peak.totalValue.currency
          )
        };
      }
    }

    return deepest === null ? null : Object.freeze(deepest);
  }
}
