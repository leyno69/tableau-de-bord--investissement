import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAcceleratedHistoricalProtocol,
  createAcceleratedHistoricalWindowRegistry,
  assessAcceleratedHistoricalLaunch,
  classifyAcceleratedHistoricalEvidence
} from './portfolioAcceleratedHistoricalCampaign.js';
import {
  createAcceleratedHistoricalDependenceMethod,
  bindDependenceMethodToWindowRegistry,
  evaluateBoundDependenceAudit
} from './portfolioAcceleratedHistoricalDependenceAudit.js';

function protocol() {
  return createAcceleratedHistoricalProtocol({
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
    previouslyInspectedIntervals: [],
    exactLicensedDataRequired: true,
    recalibrationBeforeDecisionForbidden: true,
    developmentFallbackForbidden: true,
    positiveDecisionAuthority: 'retrospective-support-only',
    negativeDecisionAuthority: 'may-reject-after-independent-audit',
    primaryFalsificationRule: 'paired-brier-delta-ci95-lower-above-zero',
    uncertaintyRule: 'dependence-aware-preregistered-method-required'
  });
}

function method(lockedProtocol = protocol()) {
  return createAcceleratedHistoricalDependenceMethod({
    auditId: 'portfolio-probability-accelerated-historical-dependence-v1',
    campaignId: lockedProtocol.campaignId,
    registeredAt: '2026-08-07T21:29:06Z',
    protocolFingerprint: lockedProtocol.fingerprint,
    statistic: 'mean-paired-brier-loss-delta',
    resamplingMethod: 'circular-moving-block-bootstrap',
    blockLengthRule: 'ceil-n-power-one-fifth',
    blockLengthSensitivityOffsets: [-1, 0, 1],
    confidenceLevel: 0.95,
    intervalType: 'basic-bootstrap-two-sided-envelope',
    bootstrapReplicates: 10000,
    bootstrapSeed: 20260807,
    minimumWindowCount: 12,
    chronologicalOrderRequired: true,
    returnValuesAccessibleAtLock: false,
    positiveDecisionAuthority: 'retrospective-support-only',
    negativeDecisionAuthority: 'may-reject-after-bound-dependence-audit',
    references: [
      'https://doi.org/10.1214/aos/1176347265',
      'https://doi.org/10.1093/biomet/82.3.561'
    ]
  });
}

function registry(lockedProtocol, count) {
  const windows = Array.from({ length: count }, (_, index) => {
    const year = 2000 + index;
    return {
      windowId: `w${String(index + 1).padStart(2, '0')}`,
      originDate: `${year}-01-01`,
      maturityDate: `${year + 1}-01-01`,
      selectedWithoutReturnValueAccess: true
    };
  });
  return createAcceleratedHistoricalWindowRegistry(lockedProtocol, windows);
}

const bindingContext = Object.freeze({
  boundAt: '2026-08-07T21:30:00Z',
  returnValuesAccessibleAtBinding: false
});

test('verrouille une méthode déterministe avant tout accès aux rendements', () => {
  const lockedProtocol = protocol();
  const first = method(lockedProtocol);
  const second = method(lockedProtocol);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.status, 'method-locked-before-return-values');
  assert.equal(first.returnValuesAccessibleAtLock, false);
  assert.throws(() => createAcceleratedHistoricalDependenceMethod({ ...first, returnValuesAccessibleAtLock: true }), /sans accès/);
});

test('lie la méthode au registre issu des métadonnées sans lire de résultat', () => {
  const lockedProtocol = protocol();
  const lockedMethod = method(lockedProtocol);
  const windowRegistry = registry(lockedProtocol, 12);
  const audit = bindDependenceMethodToWindowRegistry(lockedMethod, windowRegistry, bindingContext);
  assert.equal(audit.status, 'locked-before-return-values');
  assert.equal(audit.windowCount, 12);
  assert.equal(audit.primaryBlockLength, 2);
  assert.deepEqual(audit.blockLengths, [1, 2, 3]);
  assert.equal(audit.minimumWindowCountSatisfied, true);
  const launch = assessAcceleratedHistoricalLaunch({
    protocol: lockedProtocol,
    windowRegistry,
    sourceReadiness: { ready: true, blockers: [] },
    dependenceMethod: lockedMethod,
    dependenceAudit: audit
  });
  assert.equal(launch.status, 'ready-for-locked-historical-run');
  assert.deepEqual(launch.blockers, []);
});

test('refuse de lier la méthode à un registre vide ou à un autre protocole', () => {
  const lockedProtocol = protocol();
  const lockedMethod = method(lockedProtocol);
  const empty = createAcceleratedHistoricalWindowRegistry(lockedProtocol, []);
  assert.throws(() => bindDependenceMethodToWindowRegistry(lockedMethod, empty, bindingContext), /au moins une fenêtre/);
  assert.throws(() => bindDependenceMethodToWindowRegistry({ ...lockedMethod, protocolFingerprint: 'b'.repeat(64) }, registry(lockedProtocol, 12), bindingContext), /même protocole/);
  assert.throws(() => bindDependenceMethodToWindowRegistry(lockedMethod, registry(lockedProtocol, 12), {
    ...bindingContext,
    returnValuesAccessibleAtBinding: true
  }), /sans accès/);
});

test('évalue de façon reproductible l’enveloppe des blocs et permet une contre-preuve', () => {
  const lockedProtocol = protocol();
  const lockedMethod = method(lockedProtocol);
  const windowRegistry = registry(lockedProtocol, 12);
  const audit = bindDependenceMethodToWindowRegistry(lockedMethod, windowRegistry, bindingContext);
  const records = audit.orderedWindowIds.map(windowId => ({
    windowId,
    modelProbability: 0.9,
    benchmarkProbability: 0.5,
    binaryOutcome: false
  }));
  const first = evaluateBoundDependenceAudit({ method: lockedMethod, audit, records });
  const second = evaluateBoundDependenceAudit({ method: lockedMethod, audit, records });
  assert.deepEqual(first, second);
  assert.ok(Math.abs(first.modelBrier - 0.81) < 1e-12);
  assert.ok(Math.abs(first.benchmarkBrier - 0.25) < 1e-12);
  assert.ok(first.pairedBrierDeltaCi95.lower > 0);
  const decision = classifyAcceleratedHistoricalEvidence({ protocol: lockedProtocol, evaluation: first });
  assert.equal(decision.verdict, 'probability-claim-rejected');
});

test('un nombre de fenêtres inférieur au seuil reste inconclusif malgré un effet uniforme', () => {
  const lockedProtocol = protocol();
  const lockedMethod = method(lockedProtocol);
  const audit = bindDependenceMethodToWindowRegistry(lockedMethod, registry(lockedProtocol, 8), bindingContext);
  const records = audit.orderedWindowIds.map(windowId => ({
    windowId,
    modelProbability: 0.9,
    benchmarkProbability: 0.5,
    binaryOutcome: false
  }));
  const evaluation = evaluateBoundDependenceAudit({ method: lockedMethod, audit, records });
  assert.equal(evaluation.independenceAuditStatus, 'not-eligible-insufficient-window-count');
  assert.equal(evaluation.campaignValid, true);
  assert.equal(classifyAcceleratedHistoricalEvidence({ protocol: lockedProtocol, evaluation }).verdict, 'inconclusive');
});

test('refuse tout réordonnancement postérieur des fenêtres', () => {
  const lockedProtocol = protocol();
  const lockedMethod = method(lockedProtocol);
  const audit = bindDependenceMethodToWindowRegistry(lockedMethod, registry(lockedProtocol, 12), bindingContext);
  const records = audit.orderedWindowIds.map(windowId => ({
    windowId,
    modelProbability: 0.6,
    benchmarkProbability: 0.5,
    binaryOutcome: true
  }));
  [records[0], records[1]] = [records[1], records[0]];
  assert.throws(() => evaluateBoundDependenceAudit({ method: lockedMethod, audit, records }), /ordre chronologique/);
});
