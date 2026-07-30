const PRECISION = 10;

/**
 * Représente une somme monétaire immuable dans une devise unique.
 *
 * Money ne réalise aucune conversion de change. Toute opération binaire exige
 * des devises identiques afin d'éviter les consolidations implicites.
 */
export class Money {
  constructor(amount, currency) {
    this.amount = Money.#requireAmount(amount);
    this.currency = Money.#requireCurrency(currency);
    Object.freeze(this);
  }

  static zero(currency) {
    return new Money(0, currency);
  }

  add(other) {
    this.#requireSameCurrency(other);
    return new Money(Money.#round(this.amount + other.amount), this.currency);
  }

  subtract(other) {
    this.#requireSameCurrency(other);
    return new Money(Money.#round(this.amount - other.amount), this.currency);
  }

  multiply(multiplier) {
    const normalizedMultiplier = Number(multiplier);

    if (!Number.isFinite(normalizedMultiplier)) {
      throw new TypeError('multiplier doit être un nombre fini.');
    }

    return new Money(Money.#round(this.amount * normalizedMultiplier), this.currency);
  }

  negate() {
    return new Money(Money.#round(-this.amount), this.currency);
  }

  equals(other) {
    return other instanceof Money &&
      this.currency === other.currency &&
      this.amount === other.amount;
  }

  compare(other) {
    this.#requireSameCurrency(other);

    if (this.amount === other.amount) {
      return 0;
    }

    return this.amount < other.amount ? -1 : 1;
  }

  get isZero() {
    return this.amount === 0;
  }

  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }

  #requireSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new TypeError('La valeur doit être une instance de Money.');
    }

    if (this.currency !== other.currency) {
      throw new RangeError(
        `Impossible de combiner ${this.currency} et ${other.currency} sans taux de change explicite.`
      );
    }
  }

  static #requireAmount(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      throw new TypeError('amount doit être un nombre fini.');
    }

    return Money.#round(amount);
  }

  static #requireCurrency(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError('currency doit être une chaîne non vide.');
    }

    const currency = value.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new TypeError('currency doit être un code ISO composé de trois lettres.');
    }

    return currency;
  }

  static #round(value) {
    const factor = 10 ** PRECISION;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
