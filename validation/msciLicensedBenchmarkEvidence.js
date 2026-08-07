import { buildHistoricalSourceRegistry } from './portfolioHistoricalSourceRegistry.js';

export const msciWorldLicensedCandidate = Object.freeze({
  id: 'msci-world-netr-990100-licensed-v1',
  provider: 'MSCI',
  apiOperational: false,
  schemaDocumented: true,
  licenseVerified: true,
  researchUseAllowed: false,
  pointInTimeVerified: false,
  corporateActionsVerified: true,
  adjustmentMethodDocumented: true,
  revisionPolicyDocumented: false,
  coverageVerified: true,
  evidence: Object.freeze([
    'https://www.msci.com/indexes/index/990100/msci-world-index',
    'https://www.msci.com/legal/index-terms',
    'https://www.msci.com/legal/terms-of-use'
  ]),
  benchmark: Object.freeze({
    name: 'MSCI World Index',
    indexCode: '990100',
    returnVariant: 'NETR',
    requiredCurrency: 'EUR',
    identityStatus: 'verified-official',
    productionDataStatus: 'license-required'
  })
});

export const msciBenchmarkSourceRegistry = buildHistoricalSourceRegistry([
  msciWorldLicensedCandidate
]);
