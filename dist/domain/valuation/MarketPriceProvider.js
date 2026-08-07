/**
 * Port de domaine pour obtenir le dernier prix connu d'un actif.
 *
 * Les adaptateurs d'infrastructure doivent retourner un Money dans la devise
 * de cotation de l'actif.
 */
export class MarketPriceProvider {
  async getPrice(_assetId) {
    throw new Error('MarketPriceProvider.getPrice() doit être implémentée.');
  }
}
