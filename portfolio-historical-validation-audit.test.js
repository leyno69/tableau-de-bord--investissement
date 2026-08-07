import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationPresets } from './simulation-presets.js';
import {
  auditPortfolioForHistoricalValidation,
  buildPortfolioHistoricalValidationRegistry,
} from './portfolio-historical-validation-audit.js';

test('les presets existants restent bloqués tant que leur provenance historique n’est pas figée', () => {
  const registry = buildPortfolioHistoricalValidationRegistry(simulationPresets);
  assert.equal(registry.portfolioCount, 3);
  assert.equal(registry.eligibleCount, 0);
  assert.equal(registry.blockedCount, 3);
  for (const entry of registry.entries) {
    assert.equal(entry.eligibleForHistoricalReplay, false);
    assert.ok(entry.blockers.includes('missing-reference-date'));
    assert.ok(entry.blockers.includes('missing-rebalancing-policy'));
    assert.ok(entry.blockers.includes('missing-cost-policy'));
    assert.ok(entry.blockers.includes('missing-engine-version'));
    assert.ok(entry.blockers.includes('missing-campaign-id'));
    assert.ok(entry.blockers.includes('missing-seed-plan-id'));
    assert.ok(entry.blockers.includes('missing-result-snapshot-id'));
  }
});

test('un portefeuille entièrement référencé devient éligible au replay historique', () => {
  const audit = auditPortfolioForHistoricalValidation({
    id: 'validated-template',
    label: 'Portefeuille de validation',
    horizonYears: 10,
    allocation: [{ label: 'Monde', weight: 1 }],
    orders: [{ ticker: 'WORLD', amount: 10000, price: 100 }],
    referenceDate: '2010-01-04',
    rebalancingPolicy: 'annual-fixed-target',
    costPolicy: 'validation-cost-policy-v1',
    engineVersion: 'portfolio-simulator-v1',
    campaignId: 'campaign-001',
    seedPlanId: 'seed-plan-001',
    resultSnapshotId: 'result-snapshot-001',
  });
  assert.equal(audit.eligibleForHistoricalReplay, true);
  assert.deepEqual(audit.blockers, []);
});

test('le registre refuse les identifiants de portefeuille dupliqués', () => {
  const preset = {
    id: 'duplicate', label: 'A', horizonYears: 1,
    allocation: [{ label: 'Cash', weight: 1 }], orders: [{ ticker: 'X' }],
  };
  assert.throws(
    () => buildPortfolioHistoricalValidationRegistry([preset, { ...preset, label: 'B' }]),
    /portfolioId dupliqué/,
  );
});
