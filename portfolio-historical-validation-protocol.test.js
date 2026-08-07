import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_HISTORICAL_METRICS_V1,
  sealPortfolioHistoricalValidationProtocol,
} from './portfolio-historical-validation-protocol.js';

const valid = {
  protocolId: 'portfolio-historical-validation-v1',
  methodologyVersion: 'portfolio-historical-validation-v1',
  datasetPolicyId: 'historical-dataset-policy-v1',
  benchmarkPolicyId: 'historical-benchmark-policy-v1',
  createdWithoutOutcomeAccess: true,
  windows: [
    { purpose: 'calibration', start: '2000-01-03', end: '2007-12-31' },
    { purpose: 'validation', start: '2008-01-01', end: '2015-12-31' },
    { purpose: 'locked-test', start: '2016-01-01', end: '2025-12-31' },
  ],
  metrics: [...REQUIRED_HISTORICAL_METRICS_V1],
  refutationRules: [
    'reject-if-rank-direction-inverts-across-independent-windows',
    'mark-fragile-if-conclusion-disappears-under-reasonable-cost-stress',
    'remain-inconclusive-if-locked-test-coverage-is-insufficient',
  ],
};

test('le protocole complet est scellé avec trois fenêtres non chevauchantes', () => {
  const protocol = sealPortfolioHistoricalValidationProtocol(valid);
  assert.equal(protocol.status, 'sealed');
  assert.equal(protocol.windows.length, 3);
  assert.equal(protocol.metrics.length, REQUIRED_HISTORICAL_METRICS_V1.length);
  assert.equal(Object.isFrozen(protocol), true);
  assert.equal(Object.isFrozen(protocol.windows), true);
});

test('le protocole refuse toute création après accès aux résultats', () => {
  assert.throws(
    () => sealPortfolioHistoricalValidationProtocol({ ...valid, createdWithoutOutcomeAccess: false }),
    /createdWithoutOutcomeAccess/,
  );
});

test('le protocole refuse les fenêtres chevauchantes', () => {
  assert.throws(
    () => sealPortfolioHistoricalValidationProtocol({
      ...valid,
      windows: [
        { purpose: 'calibration', start: '2000-01-03', end: '2008-01-02' },
        { purpose: 'validation', start: '2008-01-01', end: '2015-12-31' },
        { purpose: 'locked-test', start: '2016-01-01', end: '2025-12-31' },
      ],
    }),
    /ne doivent pas se chevaucher/,
  );
});

test('le protocole refuse la suppression d’une métrique obligatoire', () => {
  assert.throws(
    () => sealPortfolioHistoricalValidationProtocol({
      ...valid,
      metrics: REQUIRED_HISTORICAL_METRICS_V1.filter(metric => metric !== 'max-drawdown'),
    }),
    /max-drawdown/,
  );
});
