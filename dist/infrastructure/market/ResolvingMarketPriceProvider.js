export class ResolvingMarketPriceProvider {
  constructor({ instrumentResolver, marketPriceProvider }) {
    requireMethod(instrumentResolver, 'resolveSymbol', 'instrumentResolver');
    requireMethod(marketPriceProvider, 'getPrice', 'marketPriceProvider');
    this.instrumentResolver = instrumentResolver;
    this.marketPriceProvider = marketPriceProvider;
  }

  async getPrice(assetId) {
    const symbol = await this.instrumentResolver.resolveSymbol(assetId);
    return this.marketPriceProvider.getPrice(symbol);
  }

  async getQuote(assetId) {
    requireMethod(this.marketPriceProvider, 'getQuote', 'marketPriceProvider');
    const symbol = await this.instrumentResolver.resolveSymbol(assetId);
    return this.marketPriceProvider.getQuote(symbol);
  }

  clearCache(assetId = null) {
    if (typeof this.marketPriceProvider.clearCache !== 'function') return;
    if (assetId == null) return this.marketPriceProvider.clearCache();
    return this.instrumentResolver.resolveSymbol(assetId).then(symbol => this.marketPriceProvider.clearCache(symbol));
  }
}

function requireMethod(value, method, field) { if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`); }
