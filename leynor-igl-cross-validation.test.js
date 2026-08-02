import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCrossValidationRegister,
  compareCampaignEffects,
  validateCandidate,
} from './leynor-igl-cross-validation.js';

test('valide un effet reproduit avec dérive et dispersion maîtrisées', () => {
  const result = compareCampaignEffects(
    { campaignId: '001', effect: -0.2, relativeDispersion: 0.04 },
    { campaignId: '002', effect: -0.18, relativeDispersion: 0.03 },
  );
  assert.equal(result.directionPreserved, true);
  assert.equal(result.validationStable, true);
  assert.equal(result.passed, true);
});

test('rejette un effet dont la direction n’est pas reproduite', () => {
  const result = compareCampaignEffects(
    { campaignId: '001', effect: -0.2, relativeDispersion: 0.03 },
    { campaignId: '002', effect: 0.1, relativeDispersion: 0.02 },
  );
  assert.equal(result.passed, false);
  assert.match(result.reason, /direction/);
});

test('rejette une validation encore instable', () => {
  const result = compareCampaignEffects(
    { campaignId: '001', effect: 0.2, relativeDispersion: 0.03 },
    { campaignId: '002', effect: 0.19, relativeDispersion: 0.08 },
  );
  assert.equal(result.passed, false);
  assert.match(result.reason, /unstable/);
});

test('exige des identifiants de campagnes indépendants', () => {
  assert.throws(
    () => compareCampaignEffects(
      { campaignId: '001', effect: 0.2, relativeDispersion: 0.03 },
      { campaignId: '001', effect: 0.19, relativeDispersion: 0.03 },
    ),
    /independent/,
  );
});

test('classe une composante reproduite sans autoriser un poids IGL', () => {
  const result = validateCandidate({
    candidateId: 'resilience',
    campaigns: [
      { campaignId: '001', effect: 0.2, relativeDispersion: 0.03 },
      { campaignId: '002', effect: 0.18, relativeDispersion: 0.03 },
      { campaignId: '003', effect: 0.19, relativeDispersion: 0.02 },
    ],
  });
  assert.equal(result.status, 'cross-validated');
  assert.equal(result.passedComparisonCount, 2);
  assert.match(result.notice, /no production IGL weight/i);
});

test('construit un registre déterministe', () => {
  const register = buildCrossValidationRegister([
    {
      candidateId: 'resilience',
      campaigns: [
        { campaignId: '001', effect: 0.2, relativeDispersion: 0.03 },
        { campaignId: '002', effect: 0.19, relativeDispersion: 0.03 },
      ],
    },
    { candidateId: 'diversification', campaigns: [] },
  ]);
  assert.equal(register.candidateCount, 2);
  assert.equal(register.crossValidatedCount, 1);
  assert.deepEqual(register.results.map((result) => result.candidateId), [
    'diversification',
    'resilience',
  ]);
  assert.equal(register.generatedAt, null);
});
