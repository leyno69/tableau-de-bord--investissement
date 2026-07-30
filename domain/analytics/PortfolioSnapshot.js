import { Money } from '../money/Money.js';

/**
 * Photographie immuable de la valeur d'un portefeuille à un instant donné.
 *
 * Une série de snapshots constitue la matière première des analyses
 * temporelles. Les flux externes sont volontairement séparés et seront
 * nécessaires pour calculer ultérieurement un TWR fiable.
 */
export class PortfolioSnapshot {
  constructor({ portfolioId, totalValue, capturedAt, source = 'VALUATION' }) {
    PortfolioSnapshot.#requireIdentifier(portfolioId, 'portfolioId');

    if (!(totalValue instanceof Money)) {
      throw new TypeError('totalValue doit être une instance de Money.');
    }

    if (totalValue.amount < 0) {
      throw new RangeError('totalValue ne peut pas être négatif.');
    }

    const normalizedCapturedAt = PortfolioSnapshot.#requireDate(
      capturedAt,
      'capturedAt'
    );

    PortfolioSnapshot.#requireIdentifier(source, 'source');

    this.portfolioId = portfolioId.trim();
    this.totalValue = totalValue;
    this.capturedAt = normalizedCapturedAt;
    this.source = source.trim();

    Object.freeze(this);
  }

  toJSON() {
    return {
      portfolioId: this.portfolioId,
      totalValue: this.totalValue.toJSON(),
      capturedAt: this.capturedAt,
      source: this.source
    };
  }

  static #requireIdentifier(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }
  }

  static #requireDate(value, fieldName) {
    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
      throw new TypeError(`${fieldName} doit être une date ISO valide.`);
    }

    return new Date(timestamp).toISOString();
  }
}
