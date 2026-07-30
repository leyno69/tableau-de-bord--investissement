const DEFAULTS = Object.freeze({
  host: '127.0.0.1',
  port: 3000,
  maxBodyBytes: 1_000_000,
  shutdownTimeoutMilliseconds: 10_000
});

export function loadServerConfig(environment = process.env) {
  if (!environment || typeof environment !== 'object') {
    throw new TypeError('environment doit être un objet.');
  }

  return Object.freeze({
    host: text(environment.HOST ?? DEFAULTS.host, 'HOST'),
    port: integer(environment.PORT ?? DEFAULTS.port, 'PORT', { minimum: 0, maximum: 65_535 }),
    maxBodyBytes: integer(environment.MAX_BODY_BYTES ?? DEFAULTS.maxBodyBytes, 'MAX_BODY_BYTES', { minimum: 1 }),
    shutdownTimeoutMilliseconds: integer(
      environment.SHUTDOWN_TIMEOUT_MS ?? DEFAULTS.shutdownTimeoutMilliseconds,
      'SHUTDOWN_TIMEOUT_MS',
      { minimum: 1 }
    )
  });
}

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function integer(value, field, { minimum, maximum = Number.MAX_SAFE_INTEGER }) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${field} doit être un entier compris entre ${minimum} et ${maximum}.`);
  }
  return number;
}
