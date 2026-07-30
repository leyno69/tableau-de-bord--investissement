const DEFAULTS = Object.freeze({
  host: '127.0.0.1',
  port: 3000,
  maxBodyBytes: 1_000_000,
  shutdownTimeoutMilliseconds: 10_000,
  marketProvider: 'bootstrap',
  marketTimeoutMilliseconds: 5_000,
  marketCacheTtlMilliseconds: 30_000,
  instrumentRepository: 'json',
  instrumentCatalogPath: './data/instruments.json'
});

export function loadServerConfig(environment = process.env) {
  if (!environment || typeof environment !== 'object') {
    throw new TypeError('environment doit être un objet.');
  }

  const marketProvider = optionalText(environment.MARKET_PROVIDER ?? DEFAULTS.marketProvider).toLowerCase();
  if (!['bootstrap', 'twelve-data'].includes(marketProvider)) {
    throw new RangeError('MARKET_PROVIDER doit valoir "bootstrap" ou "twelve-data".');
  }
  const instrumentRepository = optionalText(
    environment.INSTRUMENT_REPOSITORY ?? DEFAULTS.instrumentRepository
  ).toLowerCase();
  if (!['memory', 'json'].includes(instrumentRepository)) {
    throw new RangeError('INSTRUMENT_REPOSITORY doit valoir "memory" ou "json".');
  }

  return Object.freeze({
    host: text(environment.HOST ?? DEFAULTS.host, 'HOST'),
    port: integer(environment.PORT ?? DEFAULTS.port, 'PORT', { minimum: 0, maximum: 65_535 }),
    maxBodyBytes: integer(environment.MAX_BODY_BYTES ?? DEFAULTS.maxBodyBytes, 'MAX_BODY_BYTES', { minimum: 1 }),
    shutdownTimeoutMilliseconds: integer(
      environment.SHUTDOWN_TIMEOUT_MS ?? DEFAULTS.shutdownTimeoutMilliseconds,
      'SHUTDOWN_TIMEOUT_MS',
      { minimum: 1 }
    ),
    instrumentCatalog: Object.freeze({
      repository: instrumentRepository,
      filePath: text(
        environment.INSTRUMENT_CATALOG_PATH ?? DEFAULTS.instrumentCatalogPath,
        'INSTRUMENT_CATALOG_PATH'
      )
    }),
    market: Object.freeze({
      provider: marketProvider,
      apiKey: optionalText(environment.TWELVE_DATA_API_KEY),
      baseUrl: optionalText(environment.TWELVE_DATA_BASE_URL) || 'https://api.twelvedata.com',
      timeoutMilliseconds: integer(
        environment.MARKET_TIMEOUT_MS ?? DEFAULTS.marketTimeoutMilliseconds,
        'MARKET_TIMEOUT_MS',
        { minimum: 1 }
      ),
      cacheTtlMilliseconds: integer(
        environment.MARKET_CACHE_TTL_MS ?? DEFAULTS.marketCacheTtlMilliseconds,
        'MARKET_CACHE_TTL_MS',
        { minimum: 0 }
      )
    })
  });
}

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function optionalText(value) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new TypeError('La configuration textuelle doit être une chaîne.');
  return value.trim();
}

function integer(value, field, { minimum, maximum = Number.MAX_SAFE_INTEGER }) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${field} doit être un entier compris entre ${minimum} et ${maximum}.`);
  }
  return number;
}
