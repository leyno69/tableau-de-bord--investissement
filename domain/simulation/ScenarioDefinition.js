const STRATEGIES = new Set(['LUMP_SUM', 'DCA']);

function requireFinite(value, field, { min = 0, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
    throw new TypeError(`${field} doit être un nombre${integer ? ' entier' : ''} supérieur ou égal à ${min}.`);
  }
  return number;
}

function requireRate(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= -1) {
    throw new TypeError(`${field} doit être un taux supérieur à -100 %.`);
  }
  return number;
}

export class ScenarioDefinition {
  constructor({
    id,
    name,
    strategy = 'DCA',
    initialAmount = 0,
    monthlyAmount = 0,
    months,
    annualReturn = 0,
    annualDividendYield = 0,
    annualManagementFee = 0,
    transactionFee = 0,
    reinvestDividends = true
  }) {
    this.id = ScenarioDefinition.#requireText(id, 'id');
    this.name = ScenarioDefinition.#requireText(name, 'name');
    this.strategy = ScenarioDefinition.#requireStrategy(strategy);
    this.initialAmount = requireFinite(initialAmount, 'initialAmount');
    this.monthlyAmount = requireFinite(monthlyAmount, 'monthlyAmount');
    this.months = requireFinite(months, 'months', { min: 1, integer: true });
    this.annualReturn = requireRate(annualReturn, 'annualReturn');
    this.annualDividendYield = requireRate(annualDividendYield, 'annualDividendYield');
    this.annualManagementFee = requireFinite(annualManagementFee, 'annualManagementFee');
    this.transactionFee = requireFinite(transactionFee, 'transactionFee');
    this.reinvestDividends = Boolean(reinvestDividends);

    if (this.strategy === 'LUMP_SUM' && this.monthlyAmount !== 0) {
      throw new RangeError('Un scénario LUMP_SUM ne peut pas contenir de versement mensuel.');
    }
    if (this.initialAmount === 0 && this.monthlyAmount === 0) {
      throw new RangeError('Le scénario doit contenir au moins un versement.');
    }

    Object.freeze(this);
  }

  toJSON() {
    return { ...this };
  }

  static #requireText(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${field} doit être une chaîne non vide.`);
    }
    return value.trim();
  }

  static #requireStrategy(value) {
    const strategy = ScenarioDefinition.#requireText(value, 'strategy').toUpperCase();
    if (!STRATEGIES.has(strategy)) {
      throw new RangeError('strategy doit valoir LUMP_SUM ou DCA.');
    }
    return strategy;
  }
}
