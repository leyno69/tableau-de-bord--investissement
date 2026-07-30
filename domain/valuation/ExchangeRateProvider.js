/**
 * Port de domaine pour obtenir un taux de conversion monétaire.
 *
 * Le taux retourné convertit un montant de `fromCurrency` vers `toCurrency`.
 */
export class ExchangeRateProvider {
  async getRate(_fromCurrency, _toCurrency) {
    throw new Error('ExchangeRateProvider.getRate() doit être implémentée.');
  }
}
