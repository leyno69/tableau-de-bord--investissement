/**
 * Représente un compte financier immuable détenu auprès d'un établissement.
 *
 * Un compte décrit où les actifs ou les espèces sont conservés. Il reste
 * indépendant des connecteurs, du stockage et des règles propres à un courtier.
 */
export class Account {
  static KINDS = Object.freeze({
    SECURITIES: 'SECURITIES',
    CASH: 'CASH'
  });

  static TAX_WRAPPERS = Object.freeze({
    PEA: 'PEA',
    CTO: 'CTO',
    NONE: 'NONE'
  });

  static STATUSES = Object.freeze({
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED'
  });

  constructor(properties) {
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      throw new TypeError('Les propriétés du compte sont obligatoires.');
    }

    this.id = Account.#requireString(properties.id, 'id');
    this.portfolioId = Account.#requireString(properties.portfolioId, 'portfolioId');
    this.name = Account.#requireString(properties.name, 'name');
    this.providerId = Account.#requireString(properties.providerId, 'providerId');
    this.kind = Account.#requireEnumValue(
      properties.kind,
      Object.values(Account.KINDS),
      'kind'
    );
    this.taxWrapper = Account.#requireEnumValue(
      properties.taxWrapper ?? Account.TAX_WRAPPERS.NONE,
      Object.values(Account.TAX_WRAPPERS),
      'taxWrapper'
    );
    this.currency = Account.#requireCurrency(properties.currency ?? 'EUR');
    this.status = Account.#requireEnumValue(
      properties.status ?? Account.STATUSES.ACTIVE,
      Object.values(Account.STATUSES),
      'status'
    );
    this.externalId = properties.externalId == null
      ? null
      : Account.#requireString(properties.externalId, 'externalId');
    this.metadata = Account.#freezeMetadata(properties.metadata ?? {});

    Object.freeze(this);
  }

  get isActive() {
    return this.status === Account.STATUSES.ACTIVE;
  }

  get isClosed() {
    return this.status === Account.STATUSES.CLOSED;
  }

  get isSecuritiesAccount() {
    return this.kind === Account.KINDS.SECURITIES;
  }

  get isCashAccount() {
    return this.kind === Account.KINDS.CASH;
  }

  toJSON() {
    return {
      id: this.id,
      portfolioId: this.portfolioId,
      name: this.name,
      providerId: this.providerId,
      kind: this.kind,
      taxWrapper: this.taxWrapper,
      currency: this.currency,
      status: this.status,
      externalId: this.externalId,
      metadata: Account.#cloneValue(this.metadata)
    };
  }

  static #requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
    }

    return value.trim();
  }

  static #requireCurrency(value) {
    const currency = Account.#requireString(value, 'currency').toUpperCase();

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

  static #freezeMetadata(metadata) {
    if (!Account.#isPlainObject(metadata)) {
      throw new TypeError('metadata doit être un objet simple.');
    }

    return Account.#deepFreeze(Account.#cloneValue(metadata));
  }

  static #isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  static #cloneValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => Account.#cloneValue(item));
    }

    if (Account.#isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, Account.#cloneValue(item)])
      );
    }

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    throw new TypeError('metadata ne peut contenir que des valeurs sérialisables.');
  }

  static #deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach((item) => Account.#deepFreeze(item));
      Object.freeze(value);
    }

    return value;
  }
}
