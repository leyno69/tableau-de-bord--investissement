export class FinancialDomainError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'FinancialDomainError';
    this.code = code;
    if (details !== undefined) this.details = details;
    Object.freeze(this);
  }
}

export function invalid(field, message, value = undefined) {
  throw new FinancialDomainError('INVALID_FINANCIAL_DOMAIN_VALUE', message, {
    field,
    ...(value === undefined ? {} : { value }),
  });
}
