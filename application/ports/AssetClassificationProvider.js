/**
 * Port applicatif fournissant les dimensions d'allocation d'un actif.
 */
export class AssetClassificationProvider {
  /**
   * @param {string} assetId
   * @returns {Promise<{assetClass?: string|null, sector?: string|null, country?: string|null}>}
   */
  async getClassification(assetId) {
    throw new Error(`getClassification(${assetId}) doit être implémentée.`);
  }
}
