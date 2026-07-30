/**
 * Position immuable reconstruite à partir des transactions.
 *
 * Une Position n'est jamais saisie directement.
 * Elle est toujours calculée par le PortfolioLedger.
 */
export class Position {
  constructor({
    assetId,
    quantity = 0,
    totalCost = 0,
    averageCost = 0,
    realizedPnL = 0,
    dividends = 0,
    currency = 'EUR'
  }) {
    this.assetId = assetId;
    this.quantity = quantity;
    this.totalCost = totalCost;
    this.averageCost = averageCost;
    this.realizedPnL = realizedPnL;
    this.dividends = dividends;
    this.currency = currency;

    Object.freeze(this);
  }

  get investedCapital() {
    return this.totalCost;
  }

  get hasPosition() {
    return this.quantity > 0;
  }

  toJSON() {
    return {
      assetId: this.assetId,
      quantity: this.quantity,
      totalCost: this.totalCost,
      averageCost: this.averageCost,
      realizedPnL: this.realizedPnL,
      dividends: this.dividends,
      currency: this.currency
    };
  }
}
