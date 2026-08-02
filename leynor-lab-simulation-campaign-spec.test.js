import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationCampaignSpec } from './leynor-lab-simulation-campaign-spec.js';

const valid = {
  campaignId: 'wave6-behaviour-001', objective: 'Comparer des comportements sans prédire le futur', methodologyReleaseId: '1.0.0',
  datasetLineageId: 'dataset-1', reproducibilityBundleId: 'bundle-1', portfolioCount: 10000, seed: 42,
  horizonsYears: [30, 5, 10, 20, 15], cohorts: ['prudent', 'modéré', 'agressif'],
  scenarios: ['versements-réguliers', 'vente-panique'],
  metrics: ['final-value', 'return', 'volatility', 'max-drawdown', 'loss-frequency', 'recovery-duration', 'goal-probability', 'percentiles'],
  assumptions: ['rendements hypothétiques'], limitations: ['aucune prévision'], cancellationSupported: true, progressReportingSupported: true
};

test('prépare une campagne complète et déterministe', () => {
  const spec = createSimulationCampaignSpec(valid);
  assert.equal(spec.status, 'prepared');
  assert.deepEqual(spec.horizonsYears, [5, 10, 15, 20, 30]);
  assert.equal(spec.portfolioCount, 10000);
});

test('refuse une campagne sans métriques obligatoires', () => {
  assert.throws(() => createSimulationCampaignSpec({ ...valid, metrics: ['return'] }));
});
