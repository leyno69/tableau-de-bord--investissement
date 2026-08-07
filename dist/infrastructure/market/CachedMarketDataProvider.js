const STATUSES = Object.freeze({ FRESH: 'fresh', STALE: 'stale' });

/**
 * Décorateur de fournisseur marché avec repli sur la dernière cotation persistée.
 */
export class CachedMarketDataProvider {
  constructor({ provider, cache, clock = () => new Date(), staleAfterMs = 15 * 60 * 1000 } = {}) {
    if (!provider || typeof provider.getQuote !== 'function') {
      throw new TypeError('provider doit implémenter getQuote().');
    }
    if (!cache || typeof cache.get !== 'function' || typeof cache.save !== 'function') {
      throw new TypeError('cache doit implémenter get() et save().');
    }
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
    if (!Number.isFinite(staleAfterMs) || staleAfterMs < 0) {
      throw new RangeError('staleAfterMs doit être un nombre positif ou nul.');
    }

    this.provider = provider;
    this.cache = cache;
    this.clock = clock;
    this.staleAfterMs = staleAfterMs;
  }

  async getQuote(assetId) {
    const requestedAt = validDate(this.clock(), 'clock');

    try {
      const quote = await this.provider.getQuote(assetId);
      const fetchedAt = requestedAt.toISOString();
      await this.cache.save({ assetId, quote, fetchedAt });
      return enrich(quote, {
        status: STATUSES.FRESH,
        fetchedAt,
        ageMs: 0,
        staleAfterMs: this.staleAfterMs
      });
    } catch (cause) {
      const cached = await this.cache.get(assetId);
      if (cached == null) throw cause;

      const fetchedAt = validDate(cached.fetchedAt, 'cached.fetchedAt');
      const ageMs = Math.max(0, requestedAt.getTime() - fetchedAt.getTime());
      return enrich(cached.quote, {
        status: ageMs > this.staleAfterMs ? STATUSES.STALE : STATUSES.FRESH,
        fetchedAt: fetchedAt.toISOString(),
        ageMs,
        staleAfterMs: this.staleAfterMs,
        fallback: true,
        failureCode: typeof cause?.code === 'string' ? cause.code : 'QUOTE_PROVIDER_FAILURE'
      });
    }
  }
}

function enrich(quote, marketData) {
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)) {
    throw new TypeError('Le fournisseur doit retourner une cotation objet.');
  }
  return Object.freeze({ ...quote, marketData: Object.freeze({ ...marketData }) });
}

function validDate(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} doit produire une date valide.`);
  return date;
}
