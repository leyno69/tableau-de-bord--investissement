import { invalid } from './errors.mjs';

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CODE_RE = /^[A-Z][A-Z0-9_:-]{1,63}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const DECIMAL_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

export function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    invalid(field, `${field} must be a non-empty trimmed string`, value);
  }
  return value;
}

export function stableId(value, field = 'id') {
  const v = requiredString(value, field);
  if (!ID_RE.test(v)) invalid(field, `${field} has an invalid identifier format`, value);
  return v;
}

export function extensibleCode(value, field) {
  const v = requiredString(value, field);
  if (!CODE_RE.test(v)) invalid(field, `${field} must be an uppercase canonical code`, value);
  return v;
}

export function currency(value, field = 'currency') {
  const v = requiredString(value, field);
  if (!CURRENCY_RE.test(v)) invalid(field, `${field} must be a three-letter uppercase currency code`, value);
  return v;
}

export function optionalIsin(value, field = 'isin') {
  if (value === undefined || value === null) return null;
  const v = requiredString(value, field);
  if (!ISIN_RE.test(v)) invalid(field, `${field} is not structurally valid`, value);
  return v;
}

export function decimalString(value, field, { positive = false, allowZero = true } = {}) {
  const v = requiredString(value, field);
  if (!DECIMAL_RE.test(v)) invalid(field, `${field} must be a canonical decimal string`, value);

  const unsigned = v.startsWith('-') ? v.slice(1) : v;
  const isZero = /^0(?:\.0+)?$/.test(unsigned);
  if (v.startsWith('-') && isZero) invalid(field, `${field} must not use negative zero`, value);
  if (positive && (v.startsWith('-') || isZero)) invalid(field, `${field} must be strictly positive`, value);
  if (!allowZero && isZero) invalid(field, `${field} must be non-zero`, value);
  return v;
}

export function optionalTrimmedString(value, field) {
  if (value === undefined || value === null) return null;
  return requiredString(value, field);
}

export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
