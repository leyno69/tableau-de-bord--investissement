import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAcceleratedHistoricalProtocol,
  createAcceleratedHistoricalWindowRegistry,
  assessAcceleratedHistoricalLaunch,
  classifyAcceleratedHistoricalEvidence
} from './portfolioAcceleratedHistoricalCampaign.js';

const input = Object.freeze({
  campaignId: 'portfolio-probability-accelerated-historical-v1',
  protocolVersion: '1.0.0',
  registeredAt: '2026-08-07T21:12:47Z',
  engineCommit: '66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9',
  assumptionsFingerprint: 'a'.repeat(64),
  horizonMonths: 12,
  simulationPathsPerForecast: 5000,
  score: 'brier-score',
  benchmark: 'dynamic-point-in-time-base-rate',
  sourceTrack: 'exact-licensed-eur',
  windowSelectionRule: 'metadata-only-oldest-first-non-overlapping-12-month',
  previouslyInspectedIntervals: [{ evidenceId: 'diagnostic-v2', startDate: '2014-06-02', endDate: '2023-12-29' }],
  exactLicensedDataRequired: true,
  recalibrationBeforeDecisionForbidden: true,
  developmentFallbackForbidden: true,
  positiveDecisionAuthority: 'retrospective-support-only',
  negativeDecisionAuthority: 'may-reject-after-independent-audit',
  primaryFalsificationRule: 'paired-brier-delta-ci95-lower-above-zero',
  uncertaintyRule: 'dependence-aware-preregistered-method-required'
});

test('fige le protocole accéléré sans lui donner une autorité de validation positive', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  assert.equal(protocol.positiveDecisionAuthority, 'retrospective-support-only');
  assert.equal(protocol.horizonMonths, 12);
  assert.equal(protocol.fingerprint, createAcceleratedHistoricalProtocol({ ...input }).fingerprint);
});

test('refuse de raccourcir silencieusement la revendication à douze mois', () => {
  assert.throws(() => createAcceleratedHistoricalProtocol({ ...input, horizonMonths: 3 }), /12/);
  assert.throws(() => createAcceleratedHistoricalProtocol({ ...input, positiveDecisionAuthority: 'validated' }), /validation positive/);
  assert.throws(() => createAcceleratedHistoricalProtocol({ ...input, developmentFallbackForbidden: false }), /doit être true/);
});

test('construit des fenêtres non chevauchantes et signale les périodes déjà inspectées', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  const registry = createAcceleratedHistoricalWindowRegistry(protocol, [
    { windowId: 'w1', originDate: '2012-01-01', maturityDate: '2013-01-01', selectedWithoutReturnValueAccess: true },
    { windowId: 'w2', originDate: '2018-01-01', maturityDate: '2019-01-01', selectedWithoutReturnValueAccess: true }
  ]);
  assert.equal(registry.windows[0].historicalOutcomeNovelty, 'not-previously-inspected-by-registered-evidence');
  assert.equal(registry.windows[1].historicalOutcomeNovelty, 'previously-inspected-period');
  assert.equal(registry.windows[0].mayCountAsIndependent, false);
});

test('refuse les fenêtres chevauchantes ou sélectionnées après lecture des rendements', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  assert.throws(() => createAcceleratedHistoricalWindowRegistry(protocol, [
    { windowId: 'w1', originDate: '2012-01-01', maturityDate: '2013-01-01', selectedWithoutReturnValueAccess: true },
    { windowId: 'w2', originDate: '2012-06-01', maturityDate: '2013-06-01', selectedWithoutReturnValueAccess: true }
  ]), /non chevauchantes/);
  assert.throws(() => createAcceleratedHistoricalWindowRegistry(protocol, [
    { windowId: 'w1', originDate: '2012-01-01', maturityDate: '2013-01-01', selectedWithoutReturnValueAccess: false }
  ]), /selectedWithoutReturnValueAccess/);
});

test('bloque la campagne en l’absence de données licenciées et de fenêtres issues des métadonnées', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  const registry = createAcceleratedHistoricalWindowRegistry(protocol, []);
  const launch = assessAcceleratedHistoricalLaunch({
    protocol,
    windowRegistry: registry,
    sourceReadiness: { ready: false, blockers: ['worldProxy:missing', 'paej:missing'] }
  });
  assert.equal(launch.status, 'blocked-before-locked-historical-run');
  assert.ok(launch.blockers.includes('historical-window-registry:empty-before-source-metadata'));
  assert.ok(launch.blockers.includes('dependence-audit:method-not-locked'));
  assert.equal(launch.mayValidateProbabilityClaim, false);
});

test('une défaite Brier avec intervalle entièrement défavorable peut rejeter la revendication', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  const decision = classifyAcceleratedHistoricalEvidence({
    protocol,
    evaluation: {
      campaignValid: true,
      independenceAuditStatus: 'eligible-for-negative-decision',
      dependenceAuditFingerprint: 'd'.repeat(64),
      modelBrier: 0.22,
      benchmarkBrier: 0.18,
      pairedBrierDeltaCi95: { lower: 0.01, upper: 0.07 }
    }
  });
  assert.equal(decision.verdict, 'probability-claim-rejected');
  assert.equal(decision.mayValidateProbabilityClaim, false);
});

test('une victoire historique reste un soutien et ne valide jamais seule le moteur', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  const decision = classifyAcceleratedHistoricalEvidence({
    protocol,
    evaluation: {
      campaignValid: true,
      independenceAuditStatus: 'eligible-for-negative-decision',
      dependenceAuditFingerprint: 'd'.repeat(64),
      modelBrier: 0.16,
      benchmarkBrier: 0.19,
      pairedBrierDeltaCi95: { lower: -0.05, upper: -0.01 }
    }
  });
  assert.equal(decision.verdict, 'retrospective-support-only');
  assert.equal(decision.mayExposeRealWorldProbability, false);
});

test('sans audit d’indépendance admissible, toute comparaison reste inconclusive', () => {
  const protocol = createAcceleratedHistoricalProtocol(input);
  const decision = classifyAcceleratedHistoricalEvidence({
    protocol,
    evaluation: {
      campaignValid: true,
      independenceAuditStatus: 'not-demonstrated',
      modelBrier: 0.22,
      benchmarkBrier: 0.18,
      pairedBrierDeltaCi95: { lower: 0.01, upper: 0.07 }
    }
  });
  assert.equal(decision.verdict, 'inconclusive');
});
