/**
 * Représente une transaction financière immuable dans Leynor.
 *
 * Cette entité appartient exclusivement au domaine métier :
 * elle ne dépend ni de l'interface, ni du stockage, ni d'une API.
 */
export class Transaction {
  static TYPES = Object.freeze({
    BUY: 'buy',
    SELL: 'sell',
    DIVIDEND: 'dividend',
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    FEE: 'fee',
    TAX: 'tax'
  });

  static STATUSES = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled'
  });

  /**
   * @param {object} properties
   * @param {string} properties.id
   * @param {string} properties.portfolioId
   * @param {string} properties.accountId
   * @param {string|null} properties.assetId
   * @param {string} properties.type
   * @param {number} properties.quantity
   * @param {number} properties.unitPrice
   * @param {number} properties.fees
   * @param {number} properties.taxes
   * @param {string} properties.currency
   * @param {string} properties.executedAt
   * @param {string} properties.status
   * @param {string} properties.createdAt
   */
  constructor(properties) {
    if (!properties || typeof properties !== 'object') {
      throw new TypeError(
        'Les propriétés de la transaction sont obligatoires.'
      );
    }

    this.id = Transaction.#requireString(
      properties.id,
      'id'
    );

    this.portfolioId = Transaction.#requireString(
      properties.portfolioId,
      'portfolioId'
    );

    this.accountId = Transaction.#requireString(
      properties.accountId,
      'accountId'
    );

    this.assetId =
      properties.assetId == null
        ? null
        : Transaction.#requireString(
            properties.assetId,
            'assetId'
          );

    this.type = Transaction.#requireEnumValue(
      properties.type,
      Object.values(Transaction.TYPES),
      'type'
    );

    this.quantity = Transaction.#requireNonNegativeNumber(
      properties.quantity ?? 0,
      'quantity'
    );

    this.unitPrice = Transaction.#requireNonNegativeNumber(
      properties.unitPrice ?? 0,
      'unitPrice'
    );

    this.fees = Transaction.#requireNonNegativeNumber(
      properties.fees ?? 0,
      'fees'
    );

    this.taxes = Transaction.#requireNonNegativeNumber(
      properties.taxes ?? 0,
      'taxes'
    );

    this.currency = Transaction.#requireCurrency(
      properties.currency ?? 'EUR'
    );

    this.executedAt = Transaction.#requireIsoDate(
      properties.executedAt,
      'executedAt'
    );

    this.status = Transaction.#requireEnumValue(
      properties.status ?? Transaction.STATUSES.CONFIRMED,
      Object.values(Transaction.STATUSES),
      'status'
    );

    this.createdAt = Transaction.#requireIsoDate(
      properties.createdAt ?? new Date().toISOString(),
      'createdAt'
    );

    Transaction.#assertBusinessInvariants(this);

    Object.freeze(this);
  }

  /**
   * Montant brut de la transaction, hors frais et taxes.
   *
   * @returns {number}
   */
  get grossAmount() {
    return Transaction.#round(
      this.quantity * this.unitPrice
    );
  }

  /**
   * Montant total débité pour un achat.
   *
   * @returns {number}
   */
  get totalCost() {
    return Transaction.#round(
      this.grossAmount + this.fees + this.taxes
    );
  }

  /**
   * Montant net reçu pour une vente.
   *
   * @returns {number}
   */
  get netProceeds() {
    return Transaction.#round(
      this.grossAmount - this.fees - this.taxes
    );
  }

  /**
   * Indique si la transaction est définitivement validée.
   *
   * @returns {boolean}
   */
  get isConfirmed() {
    return this.status === Transaction.STATUSES.CONFIRMED;
  }

  /**
   * Retourne une représentation sérialisable.
   *
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      portfolioId: this.portfolioId,
      accountId: this.accountId,
      assetId: this.assetId,
      type: this.type,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      fees: this.fees,
      taxes: this.taxes,
      currency: this.currency,
      executedAt: this.executedAt,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  static #assertBusinessInvariants(transaction) {
    const assetTransactionTypes = [
      Transaction.TYPES.BUY,
      Transaction.TYPES.SELL,
      Transaction.TYPES.DIVIDEND
    ];

    if (
      assetTransactionTypes.includes(transaction.type) &&
      transaction.assetId === null
    ) {
      throw new TypeError(
        `assetId est obligatoire pour une transaction de type "${transaction.type}".`
      );
    }

    const quantityRequiredTypes = [
      Transaction.TYPES.BUY,
      Transaction.TYPES.SELL
    ];

    if (
      quantityRequiredTypes.includes(transaction.type) &&
      transaction.quantity <= 0
    ) {
      throw new RangeError(
        `quantity doit être strictement positive pour une transaction de type "${transaction.type}".`
      );
    }

    if (
      quantityRequiredTypes.includes(transaction.type) &&
      transaction.unitPrice <= 0
    ) {
      throw new RangeError(
        `unitPrice doit être strictement positif pour une transaction de type "${transaction.type}".`
      );
    }

    if (
      transaction.type === Transaction.TYPES.DIVIDEND &&
      transaction.unitPrice <= 0
    ) {
      throw new RangeError(
        'unitPrice doit représenter un dividende strictement positif.'
      );
    }
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(
        `${fieldName} doit être une chaîne non vide.`
      );
    }

    return value.trim();
  }

  static #requireNonNegativeNumber(value, fieldName) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      throw new RangeError(
        `${fieldName} doit être un nombre positif ou nul.`
      );
    }

    return Transaction.#round(number);
  }

  static #requireCurrency(value) {
    const currency = Transaction.#requireString(
      value,
      'currency'
    ).toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new TypeError(
        'currency doit être un code ISO composé de trois lettres.'
      );
    }

    return currency;
  }

  static #requireIsoDate(value, fieldName) {
    const dateValue = Transaction.#requireString(
      value,
      fieldName
    );

    const timestamp = Date.parse(dateValue);

    if (Number.isNaN(timestamp)) {
      throw new TypeError(
        `${fieldName} doit contenir une date ISO valide.`
      );
    }

    return new Date(timestamp).toISOString();
  }

  static #requireEnumValue(value, allowedValues, fieldName) {
    if (!allowedValues.includes(value)) {
      throw new TypeError(
        `${fieldName} doit être l'une des valeurs suivantes : ${allowedValues.join(', ')}.`
      );
    }

    return value;
  }

  static #round(value, precision = 10) {
    const factor = 10 ** precision;

    return (
      Math.round(
        (value + Number.EPSILON) * factor
      ) / factor
    );
  }
}