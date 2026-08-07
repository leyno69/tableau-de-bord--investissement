export class CachedExchangeRateProvider {
  constructor({ provider, cache, clock = () => new Date(), staleAfterMs = 60 * 60 * 1000 } = {}) {
    if (!provider || typeof provider.getRate !== 'function') throw new TypeError('provider doit implémenter getRate().');
    if (!cache || typeof cache.get !== 'function' || typeof cache.save !== 'function') throw new TypeError('cache doit implémenter get() et save().');
    if (typeof clock !== 'function') throw new TypeError('clock doit être une fonction.');
    if (!Number.isFinite(staleAfterMs) || staleAfterMs < 0) throw new RangeError('staleAfterMs doit être positif ou nul.');
    this.provider = provider;
    this.cache = cache;
    this.clock = clock;
    this.staleAfterMs = staleAfterMs;
  }

  async getRate(from, to) {
    return (await this.getRateDetails(from, to)).rate;
  }

  async getRateDetails(from, to) {
    const normalizedFrom = currency(from, 'from');
    const normalizedTo = currency(to, 'to');
    if (normalizedFrom === normalizedTo) {
      return details({ from: normalizedFrom, to: normalizedTo, rate: 1, status: 'fresh', fetchedAt: validDate(this.clock(), 'clock').toISOString(), ageMs: 0, staleAfterMs: this.staleAfterMs });
    }

    const requestedAt = validDate(this.clock(), 'clock');
    try {
      const rate = positive(await this.provider.getRate(normalizedFrom, normalizedTo));
      const fetchedAt = requestedAt.toISOString();
      await this.cache.save({ from: normalizedFrom, to: normalizedTo, rate, fetchedAt });
      return details({ from: normalizedFrom, to: normalizedTo, rate, status: 'fresh', fetchedAt, ageMs: 0, staleAfterMs: this.staleAfterMs });
    } catch (cause) {
      const cached = await this.cache.get(normalizedFrom, normalizedTo);
      if (cached == null) throw cause;
      const fetchedAt = validDate(cached.fetchedAt, 'cached.fetchedAt');
      const ageMs = Math.max(0, requestedAt.getTime() - fetchedAt.getTime());
      return details({
        from: normalizedFrom,
        to: normalizedTo,
        rate: positive(cached.rate),
        status: ageMs > this.staleAfterMs ? 'stale' : 'fresh',
        fetchedAt: fetchedAt.toISOString(),
        ageMs,
        staleAfterMs: this.staleAfterMs,
        fallback: true,
        failureCode: typeof cause?.code === 'string' ? cause.code : 'EXCHANGE_RATE_PROVIDER_FAILURE'
      });
    }
  }
}

function details(value) { return Object.freeze({ ...value }); }
function positive(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('Le taux doit être strictement positif.');
  return rate;
}
function currency(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) throw new TypeError(`${field} doit être un code ISO à trois lettres.`);
  return value.trim().toUpperCase();
}
function validDate(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} doit produire une date valide.`);
  return date;
}
