const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} doit être une chaîne non vide.`);
  }

  return value.trim();
}

function isRealDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseExecutionTime(value, fieldName = 'executedAt') {
  const sourceValue = requireString(value, fieldName);

  if (DATE_PATTERN.test(sourceValue)) {
    if (!isRealDate(sourceValue)) {
      throw new TypeError(`${fieldName} doit contenir une date civile valide.`);
    }

    return Object.freeze({
      value: sourceValue,
      precision: 'DATE'
    });
  }

  if (!INSTANT_PATTERN.test(sourceValue)) {
    throw new TypeError(
      `${fieldName} doit être une date YYYY-MM-DD ou un instant ISO avec fuseau explicite.`
    );
  }

  const timestamp = Date.parse(sourceValue);
  if (Number.isNaN(timestamp)) {
    throw new TypeError(`${fieldName} doit contenir un instant ISO valide.`);
  }

  return Object.freeze({
    value: new Date(timestamp).toISOString(),
    precision: 'INSTANT'
  });
}

export function parseTechnicalInstant(value, fieldName) {
  const sourceValue = requireString(value, fieldName);

  if (!INSTANT_PATTERN.test(sourceValue)) {
    throw new TypeError(`${fieldName} doit contenir un instant ISO avec fuseau explicite.`);
  }

  const timestamp = Date.parse(sourceValue);
  if (Number.isNaN(timestamp)) {
    throw new TypeError(`${fieldName} doit contenir un instant ISO valide.`);
  }

  return new Date(timestamp).toISOString();
}
