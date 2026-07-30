export function createBootstrapProviders() {
  return Object.freeze({
    marketPriceProvider: Object.freeze({
      async getPrice(assetId) {
        throw new Error(`Aucun fournisseur de prix n'est configuré pour l'actif "${assetId}".`);
      }
    }),
    exchangeRateProvider: Object.freeze({
      async getRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        throw new Error(`Aucun fournisseur de change n'est configuré pour ${fromCurrency}/${toCurrency}.`);
      }
    }),
    assetClassificationProvider: Object.freeze({
      async getClassification() {
        return Object.freeze({ assetClass: 'UNKNOWN', region: 'UNKNOWN', sector: 'UNKNOWN' });
      }
    })
  });
}
