import { buildHistoricalSourceRegistry, twelveDataHistoricalCandidate } from './portfolioHistoricalSourceRegistry.js';

export const tiingoHistoricalCandidate = Object.freeze({
  id: 'tiingo-eod-v1',
  provider: 'Tiingo',
  apiOperational: false,
  schemaDocumented: true,
  licenseVerified: true,
  researchUseAllowed: false,
  pointInTimeVerified: false,
  corporateActionsVerified: true,
  adjustmentMethodDocumented: true,
  revisionPolicyDocumented: true,
  coverageVerified: false,
  evidence: Object.freeze([
    'https://www.tiingo.com/documentation/end-of-day',
    'https://www.tiingo.com/documentation/general',
    'https://api.tiingo.com/tos/'
  ])
});

export const eodhdHistoricalCandidate = Object.freeze({
  id: 'eodhd-eod-v1',
  provider: 'EODHD',
  apiOperational: false,
  schemaDocumented: true,
  licenseVerified: true,
  researchUseAllowed: false,
  pointInTimeVerified: false,
  corporateActionsVerified: true,
  adjustmentMethodDocumented: false,
  revisionPolicyDocumented: false,
  coverageVerified: false,
  evidence: Object.freeze([
    'https://eodhd.com/financial-apis/delisted-stock-companies-data-2',
    'https://eodhd.com/financial-apis/terms-conditions'
  ])
});

export const norgateHistoricalCandidate = Object.freeze({
  id: 'norgate-data-v1',
  provider: 'Norgate Data',
  apiOperational: false,
  schemaDocumented: true,
  licenseVerified: true,
  researchUseAllowed: false,
  pointInTimeVerified: false,
  corporateActionsVerified: false,
  adjustmentMethodDocumented: false,
  revisionPolicyDocumented: false,
  coverageVerified: false,
  evidence: Object.freeze([
    'https://norgatedata.com/accessibility.php',
    'https://norgatedata.com/subscribe/eula.php',
    'https://norgatedata.com/subscribe/subscribe.php'
  ])
});

export const auditedHistoricalProviderRegistry = buildHistoricalSourceRegistry([
  twelveDataHistoricalCandidate,
  tiingoHistoricalCandidate,
  eodhdHistoricalCandidate,
  norgateHistoricalCandidate
]);
