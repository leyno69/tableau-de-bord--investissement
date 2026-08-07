import { Money } from '../money/Money.js';
import {
  parseExecutionTime,
  parseTechnicalInstant
} from './TransactionTime.js';

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

  static CONTEXTS = Object.freeze({
    REAL: 'REAL',
    SIMULATION: 'SIMULATION'
  });

  static STANDALONE_AMOUNT_TYPES = Object.freeze([
    Transaction.TYPES.DIVIDEND,
    Transaction.TYPES.DEPOSIT,
    Transaction.TYPES.WITHDRAWAL,
    Transaction.TYPES.FEE,
    Transaction.TYPES.TAX
  ]);

  constructor(properties) {
    if (!properties || typeof properties !== 'object') {
      throw new TypeError('Les propriétés de la transaction sont obligatoires.');
    }

    this.id = Transaction.#requireString(properties.id, 'id');
    this.portfolioId = Transaction.#requireString(properties.portfolioId, 'portfolioId');
    this.accountId = Transaction.#requireString(properties.accountId, 'accountId');
    this.assetId = properties.assetId == null
      ? null
      : Transaction.#requireString(properties.assetId, 'assetId');
    this.type = Transaction.#requireEnumValue(
      properties.type,
      Object.values(Transaction.TYPES),
      'type'
    );
    this.context = Transaction.#requireEnumValue(
      properties.context ?? Transaction.CONTEXTS.REAL,
      Object.values(Transaction.CONTEXTS),
      'context'
    );
    this.quantity = Transaction.#requireNonNegativeNumber(properties.quantity ?? 0, 'quantity');
    this.unitPrice = Transaction.#requireNonNegativeNumber(properties.unitPrice ?? 0, 'unitPrice');
    this.fees = Transaction.#requireNonNegativeNumber(properties.fees ?? 0, 'fees');
    this.taxes = Transaction.#requireNonNegativeNumber(properties.taxes ?? 0, 'taxes');
    this.currency = Transaction.#requireCurrency(properties.currency ?? 'EUR');
    this.amount = Transaction.#resolveAmount(properties.amount, this);

    const executionTime = parseExecutionTime(properties.executedAt);
    this.executedAt = executionTime.value;
    this.executedAtPrecision = executionTime.precision;

    this.status = Transaction.#requireEnumValue(
      properties.status ?? Transaction.STATUSES.CONFIRMED,
      Object.values(Transaction.STATUSES),
      'status'
    );
    this.createdAt = parseTechnicalInstant(
      properties.createdAt ?? new Date().toISOString(),
      'createdAt'
    );

    Transaction.#assertBusinessInvariants(this);
    Object.freeze(this);
  }

  get grossAmount() {
    return Transaction.#round(this.quantity * this.unitPrice);
  }

  get grossAmountMoney() {
    return new Money(this.grossAmount, this.currency);
  }

  get amountMoney() {
    return this.amount === null ? null : new Money(this.amount, this.currency);
  }

  get feesMoney() {
    return new Money(this.fees, this.currency);
  }

  get taxesMoney() {
    return new Money(this.taxes, this.currency);
  }

  get totalCost() {
    return this.totalCostMoney.amount;
  }

  get totalCostMoney() {
    return this.grossAmountMoney.add(this.feesMoney).add(this.taxesMoney);
  }

  get netProceeds() {
    return this.netProceedsMoney.amount;
  }

  get netProceedsMoney() {
    return this.grossAmountMoney.subtract(this.feesMoney).subtract(this.taxesMoney);
  }

  get hasStandaloneAmount() {
    return this.amount !== null;
  }

  get isConfirmed() {
    return this.status === Transaction.STATUSES.CONFIRMED;
  }

  get isReal() {
    return this.context === Transaction.CONTEXTS.REAL;
  }

  get isSimulation() {
    return this.context === Transaction.CONTEXTS.SIMULATION;
  }

  toJSON() {
    return {
      id: this.id,
      portfolioId: this.portfolioId,
      accountId: this.accountId,
      assetId: this.assetId,
      type: this.type,
      context: this.context,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      amount: this.amount,
      fees: this.fees,
      taxes: this.taxes,
      currency: this.currency,
      executedAt: this.executedAt,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  static #resolveAmount(value, transaction) {
    if (value != null) {
      return Transaction.#requireNonNegativeNumber(value, 'amount');
    }

    if (!Transaction.STANDALONE_AMOUNT_TYPES.includes(transaction.type)) {
      return null;
    }

    if (transaction.type === Transaction.TYPES.DIVIDEND && transaction.quantity > 0) {
      return transaction.grossAmount;
    }

    // Compatibilité transitoire avec les anciennes données qui portaient les
    // montants autonomes dans unitPrice.
    return transaction.unitPrice;
  }

  static #assertBusinessInvariants(transaction) {
    const assetTransactionTypes = [
      Transaction.TYPES.BUY,
      Transaction.TYPES.SELL,
      Transaction.TYPES.DIVIDEND
    ];

    if (assetTransactionTypes.includes(transaction.type) && transaction.assetId === null) {
      throw new TypeError(
        `assetId est obligatoire pour une transaction de type "${transaction.type}".`
      );
    }

    const quantityRequiredTypes = [Transaction.TYPES.BUY, Transaction.TYPES.SELL];

    if (quantityRequiredTypes.includes(transaction.type) && transaction.quantity <= 0) {
      throw new RangeError(
        `quantity doit être strictement positive pour une transaction de type "${transaction.type}".`
      );
    }

    if (quantityRequiredTypes.includes(transaction.type) && transaction.unitPrice <= 0) {
      throw new RangeError(
        `unitPrice doit être strictement positif pour une transaction de type "${transaction.type}".`
      );
    }

    if (Transaction.STANDALONE_AMOUNT_TYPES.includes(transaction.type) && transaction.amount <= 0) {
      throw new RangeError(
        `amount doit être strictement positif pour une transaction de type "${transaction.type}".`
      );
    }
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }

    return value.trim();
  }

  static #requireNonNegativeNumber(value, fieldName) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      throw new RangeError(`${fieldName} doit être un nombre positif ou nul.`);
    }

    return Transaction.#round(number);
  }

  static #requireCurrency(value) {
    const currency = Transaction.#requireString(value, 'currency').toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new TypeError('currency doit être un code ISO composé de trois lettres.');
    }

    return currency;
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
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}