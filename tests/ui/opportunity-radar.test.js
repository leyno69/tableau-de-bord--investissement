import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpportunityCard,
  createRadarAssessment,
  demoOpportunityCards,
  rankOpportunities
} from '../../opportunity-radar.js';

function card(asset, assessment) {
  return createOpportunityCard({
    asset,
    category: 'Marché',
    thesis: `Étudier ${asset}`,
    assessment,
    horizon: '1 mois',
    favorableEvidence: [],
    counterEvidence: [],
    risks: [],
    limitations: ['Conclusion conditionnelle'],
    sources: ['Source déclarée'],
    freshness: '2026-08-04'
  });
}

test('un score non calibré est explicitement indisponible', () => {
  const assessment = createRadarAssessment({ reason: 'Calibration absente.' });
  assert.deepEqual(assessment, {
    status: 'unavailable',
    label: 'Non calibré',
    reason: 'Calibration absente.'
  });
  assert.ok(Object.isFrozen(assessment));
});

test('une probabilité exige une calibration validée et traçable', () => {
  const assessment = createRadarAssessment({
    status: 'validated',
    probability: 0.62,
    calibrationId: 'cal-radar-001',
    methodologyVersion: 'radar-v1',
    observedAt: '2026-08-04T18:00:00Z'
  });
  assert.equal(assessment.probability, 0.62);
  assert.equal(assessment.calibrationId, 'cal-radar-001');
  assert.throws(() => createRadarAssessment({ status: 'validated', probability: 0.8 }), /calibrationId/);
});

test('opportunity cards are immutable and transparent', () => {
  const opportunity = card('ETF Monde', { reason: 'Démonstration non calibrée.' });
  assert.ok(Object.isFrozen(opportunity));
  assert.ok(Object.isFrozen(opportunity.sources));
  assert.ok(Object.isFrozen(opportunity.assessment));
  assert.equal(opportunity.assessment.status, 'unavailable');
  assert.equal('confidence' in opportunity, false);
});

test('ranking prioritizes validated probabilities without mutating input', () => {
  const validated = probability => ({
    status: 'validated',
    probability,
    calibrationId: `cal-${probability}`,
    methodologyVersion: 'radar-v1',
    observedAt: '2026-08-04T18:00:00Z'
  });
  const input = [card('Non calibré', {}), card('B', validated(0.55)), card('A', validated(0.75))];
  const ranked = rankOpportunities(input);
  assert.deepEqual(input.map(item => item.asset), ['Non calibré', 'B', 'A']);
  assert.deepEqual(ranked.map(item => item.asset), ['A', 'B', 'Non calibré']);
  assert.ok(Object.isFrozen(ranked));
});

test('demo cards expose risks, limits, sources and no fabricated percentage', () => {
  assert.ok(demoOpportunityCards.length > 0);
  for (const opportunity of demoOpportunityCards) {
    assert.ok(opportunity.risks.length > 0);
    assert.ok(opportunity.limitations.length > 0);
    assert.ok(opportunity.sources.length > 0);
    assert.equal(opportunity.assessment.status, 'unavailable');
    assert.equal('confidence' in opportunity, false);
  }
});
