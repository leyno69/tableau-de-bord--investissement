import { Money } from '../../domain/money/Money.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';

const PRECISION = 10;

/**
 * Analyse une série chronologique de valorisations.
 *
 * Les flux externes sont affectés à la période (snapshot précédent, snapshot
 * courant]. Ils sont supposés intervenir en fin de période : le rendement
 * neutralisé vaut donc (valeur finale - flux net) / valeur initiale - 1.
 */
export class AnalyzePortfolioSeries {
  execute({ snapshots, externalFlows = [], periodsPerYear = null }) {
    if (!Array.isArray(snapshots)) {
      throw new TypeError('snapshots doit être un tableau.');
    }

    if (!Array.isArray(externalFlows)) {
      throw new TypeError('externalFlows doit être un tableau.');
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
    const normalizedFlows = this.#normalizeFlows(externalFlows, ordered);

    if (ordered.length === 0) {
      return Object.freeze({
        portfolioId: null,
        currency: null,
        snapshots: Object.freeze([]),
        externalFlows: Object.freeze(normalizedFlows),
        returns: Object.freeze([]),
        startValue: null,
        endValue: null,
        absoluteChange: null,
        netExternalFlow: null,
        investmentGain: null,
        cumulativeReturn: null,
        timeWeightedReturn: null,
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
      const periodFlow = this.#sumFlowsBetween(
        normalizedFlows,
        previous.capturedAt,
        current.capturedAt
      );
      const rate = previous.totalValue.amount === 0
        ? null
        : AnalyzePortfolioSeries.#round(
            ((current.totalValue.amount - periodFlow) / previous.totalValue.amount) - 1
          );

      returns.push(Object.freeze({
        from: previous.capturedAt,
        to: current.capturedAt,
        startValue: previous.totalValue,
        endValue: current.totalValue,
        netExternalFlow: new Money(periodFlow, first.totalValue.currency),
        rate
      }));
    }

    const numericReturns = returns
      .map(entry => entry.rate)
      .filter(rate => rate !== null);

    const averagePeriodicReturn = numericReturns.length === 0
      ? null
      : AnalyzePortfolioSeries.#round(
          numericReturns.reduce((sum, value) => sum + value, 0) /
            numericReturns.length
        );

    const periodicVolatility = numericReturns.length < 2
      ? null
      : AnalyzePortfolioSeries.#round(
          Math.sqrt(
            numericReturns.reduce(
              (sum, value) => sum + ((value - averagePeriodicReturn) ** 2),
              0
            ) / (numericReturns.length - 1)
          )
        );

    const netExternalFlowAmount = normalizedFlows.reduce(
      (sum, flow) => sum + flow.amount.amount,
      0
    );
    const cumulativeReturn = first.totalValue.amount === 0
      ? null
      : AnalyzePortfolioSeries.#round(
          (last.totalValue.amount / first.totalValue.amount) - 1
        );
    const timeWeightedReturn = numericReturns.length !== returns.length
      ? null
      : AnalyzePortfolioSeries.#round(
          numericReturns.reduce((growth, rate) => growth * (1 + rate), 1) - 1
        );

    const maxDrawdown = this.#calculateMaxDrawdown(ordered);

    return Object.freeze({
      portfolioId: first.portfolioId,
      currency: first.totalValue.currency,
      snapshots: Object.freeze(ordered),
      externalFlows: Object.freeze(normalizedFlows),
      returns: Object.freeze(returns),
      startValue: first.totalValue,
      endValue: last.totalValue,
      absoluteChange: new Money(
        last.totalValue.amount - first.totalValue.amount,
        first.totalValue.currency
      ),
      netExternalFlow: new Money(netExternalFlowAmount, first.totalValue.currency),
      investmentGain: new Money(
        last.totalValue.amount - first.totalValue.amount - netExternalFlowAmount,
        first.totalValue.currency
      ),
      cumulativeReturn,
      timeWeightedReturn,
      averagePeriodicReturn,
      periodicVolatility,
      annualizedVolatility: periodicVolatility === null || periodsPerYear === null
        ? null
        : AnalyzePortfolioSeries.#round(
            periodicVolatility * Math.sqrt(periodsPerYear)
          ),
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

  #normalizeFlows(externalFlows, snapshots) {
    const currency = snapshots[0]?.totalValue.currency ?? null;

    return externalFlows
      .map(flow => {
        if (flow === null || typeof flow !== 'object') {
          throw new TypeError('Chaque flux externe doit être un objet.');
        }

        const timestamp = Date.parse(flow.occurredAt);
        if (!Number.isFinite(timestamp)) {
          throw new TypeError('occurredAt doit être une date ISO valide.');
        }

        if (!(flow.amount instanceof Money)) {
          throw new TypeError('Le montant du flux doit être une instance de Money.');
        }

        if (currency !== null && flow.amount.currency !== currency) {
          throw new TypeError('Les flux externes doivent utiliser la devise du portefeuille.');
        }

        return Object.freeze({
          occurredAt: new Date(timestamp).toISOString(),
          amount: flow.amount
        });
      })
      .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
  }

  #sumFlowsBetween(flows, from, to) {
    const fromTimestamp = Date.parse(from);
    const toTimestamp = Date.parse(to);

    return flows.reduce((sum, flow) => {
      const timestamp = Date.parse(flow.occurredAt);
      return timestamp > fromTimestamp && timestamp <= toTimestamp
        ? sum + flow.amount.amount
        : sum;
    }, 0);
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
        : AnalyzePortfolioSeries.#round(
            (snapshot.totalValue.amount / peak.totalValue.amount) - 1
          );

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

  static #round(value) {
    const factor = 10 ** PRECISION;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
