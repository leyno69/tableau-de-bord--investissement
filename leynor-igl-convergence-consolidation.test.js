import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessCandidateEvidence,
  buildConvergenceRegister,
  summarizeConvergence,
} from './leynor-igl-convergence-consolidation.js';

const stableCells = [
  { cellKey: 'a', relativeDispersion: 0.03, effectDrift: 0.01 },
  { cellKey: 'b', relativeDispersion: 0.04, effectDrift: 0.015 },
  { cellKey: 'c', relativeDispersion: 0.02, effectDrift: 0.005 },
  { cellKey: 'd', relativeDispersion: 0.05, effectDrift: 0.02 },
  { cellKey: 'e', relativeDispersion: 0.06, effectDrift: 0.01 },
];

test('résume la convergence sans masquer les cellules instables', () => {
  const summary = summarizeConvergence(stableCells);
  assert.equal(summary.cellCount, 5);
  assert.equal(summary.stableCount, 4);
  assert.equal(summary.unstableCount, 1);
  assert.equal(summary.stableShare, 0.8);
  assert.equal(summary.converged, true);
  assert.equal(summary.maximumDispersion, 0.06);
});

test('refuse une convergence insuffisante', () => {
  const summary = summarizeConvergence([
    { cellKey: 'a', relativeDispersion: 0.08, effectDrift: 0.03 },
    { cellKey: 'b', relativeDispersion: 0.09, effectDrift: 0.04 },
  ]);
  assert.equal(summary.converged, false);
  assert.equal(summary.stableCount, 0);
});

test('exige plusieurs campagnes indépendantes avant validation', () => {
  const oneCampaign = assessCandidateEvidence([{ campaignId: '001', converged: true }]);
  assert.equal(oneCampaign.status, 'insufficient-evidence');
  assert.equal(oneCampaign.sufficientIndependentEvidence, false);

  const twoCampaigns = assessCandidateEvidence([
    { campaignId: '001', converged: true },
    { campaignId: '002', converged: true },
  ]);
  assert.equal(twoCampaigns.status, 'eligible-for-validation');
  assert.match(twoCampaigns.notice, /no IGL weight/i);
});

test('construit un registre déterministe par candidat', () => {
  const entries = [
    { candidateId: 'resilience', campaignId: '001', cells: stableCells },
    { candidateId: 'resilience', campaignId: '002', cells: stableCells },
    { candidateId: 'diversification', campaignId: '001', cells: stableCells },
  ];
  const register = buildConvergenceRegister(entries);
  assert.equal(register.candidateCount, 2);
  assert.deepEqual(register.candidates.map((candidate) => candidate.candidateId), [
    'diversification',
    'resilience',
  ]);
  assert.equal(register.candidates[0].evidence.status, 'insufficient-evidence');
  assert.equal(register.candidates[1].evidence.status, 'eligible-for-validation');
  assert.equal(register.generatedAt, null);
});

test('rejette les données invalides', () => {
  assert.throws(() => summarizeConvergence([]), /non-empty/);
  assert.throws(
    () => summarizeConvergence([{ cellKey: 'a', relativeDispersion: -1, effectDrift: 0 }]),
    /non-negative/,
  );
});
