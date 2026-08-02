function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export class MarketDataProvider {
  constructor({ providerId, capabilities }) {
    if (new.target === MarketDataProvider) throw new TypeError('MarketDataProvider is abstract');
    this.providerId = assertNonEmptyString(providerId, 'providerId');
    this.capabilities = deepFreeze({
      prices: Boolean(capabilities?.prices),
      corporateActions: Boolean(capabilities?.corporateActions),
      pointInTime: Boolean(capabilities?.pointInTime),
      revisions: Boolean(capabilities?.revisions),
      delistedEntities: Boolean(capabilities?.delistedEntities),
    });
    Object.freeze(this);
  }

  async fetchPrices() {
    throw new Error('fetchPrices must be implemented');
  }

  async fetchCorporateActions() {
    throw new Error('fetchCorporateActions must be implemented');
  }

  async fetchMetadata() {
    throw new Error('fetchMetadata must be implemented');
  }
}

export function auditProviderCapabilities(provider, requirements = {}) {
  if (!(provider instanceof MarketDataProvider)) throw new TypeError('provider must implement MarketDataProvider');
  const required = Object.entries(requirements)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name);
  const missing = required.filter((name) => provider.capabilities[name] !== true);
  return deepFreeze({
    providerId: provider.providerId,
    required,
    missing,
    eligible: missing.length === 0,
    readyForExternalValidation: false,
    readyForProduction: false,
  });
}
