import { invalid } from './errors.mjs';
import { deepFreeze, requiredString } from './validation.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const PARTIAL_RE = /^(?:\d{4}|\d{4}-\d{2})$/;

function isRealDate(text) {
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function createTemporal(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    invalid('temporal', 'temporal must be an object', input);
  }

  const kind = requiredString(input.kind, 'temporal.kind');
  const value = requiredString(input.value, 'temporal.value');

  if (kind === 'DATE') {
    if (!DATE_RE.test(value) || !isRealDate(value)) invalid('temporal.value', 'DATE must be a valid YYYY-MM-DD value', value);
  } else if (kind === 'INSTANT') {
    if (!INSTANT_RE.test(value) || Number.isNaN(Date.parse(value))) invalid('temporal.value', 'INSTANT must preserve an explicit Z or UTC offset', value);
  } else if (kind === 'PARTIAL') {
    if (!PARTIAL_RE.test(value)) invalid('temporal.value', 'PARTIAL must be YYYY or YYYY-MM', value);
    if (value.length === 7) {
      const month = Number(value.slice(5, 7));
      if (month < 1 || month > 12) invalid('temporal.value', 'PARTIAL month must be between 01 and 12', value);
    }
  } else {
    invalid('temporal.kind', 'Unsupported temporal kind', kind);
  }

  return deepFreeze({ kind, value });
}
