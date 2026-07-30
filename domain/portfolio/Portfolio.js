/**
 * Représente le périmètre patrimonial consolidé d'un utilisateur.
 *
 * Le portefeuille ne contient ni solde ni position persistée. Ces vues sont
 * reconstruites à partir des comptes et des transactions.
 */
export class Portfolio {
  static STATUSES = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
  });

  constructor(properties) {
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      throw new TypeError('Les propriétés du portefeuille sont obligatoires.');
    }

    this.id = Portfolio.#requireString(properties.id, 'id');
    this.name = Portfolio.#requireString(properties.name, 'name');
    this.baseCurrency = Portfolio.#requireCurrency(properties.baseCurrency ?? 'EUR');
    this.status = Portfolio.#requireEnumValue(
      properties.status ?? Portfolio.STATUSES.ACTIVE,
      Object.values(Portfolio.STATUSES),
      'status'
    );

    Object.freeze(this);
  }

  get isActive() {
    return this.status === Portfolio.STATUSES.ACTIVE;
  }

  get isArchived() {
    return this.status === Portfolio.STATUSES.ARCHIVED;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      baseCurrency: this.baseCurrency,
      status: this.status
    };
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }

    return value.trim();
  }

  static #requireCurrency(value) {
    const currency = Portfolio.#requireString(value, 'baseCurrency').toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new TypeError('baseCurrency doit être un code ISO composé de trois lettres.');
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
}
